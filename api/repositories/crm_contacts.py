# CRM Contact Management Repository
import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.crm import (
    ContactCreate, ContactUpdate, ContactOut, ContactActivityCreate, ContactActivityOut,
    ContactTypeCreate, ContactTypeOut
)

# ==============================================
# CONTACT MANAGEMENT FUNCTIONS
# ==============================================

def create_contact(contact_data: ContactCreate, created_by: UUID) -> ContactOut:
    """Create a new contact"""
    if not DB_ENABLED:
        contact_id = UUID('12345678-1234-1234-1234-123456789012')
        return ContactOut(
            id=contact_id,
            **contact_data.model_dump(),
            created_by=created_by,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO contacts (
                        first_name, last_name, email, phone, mobile, company, job_title,
                        contact_type_id, assigned_to, address, notes, is_active,
                        created_by, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id, created_at, updated_at
                """, (
                    contact_data.first_name, contact_data.last_name, contact_data.email,
                    contact_data.phone, contact_data.mobile, contact_data.company, contact_data.job_title,
                    contact_data.contact_type_id, contact_data.assigned_to, contact_data.address,
                    contact_data.notes, contact_data.is_active, created_by, datetime.now(), datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    contact_id, created_at, updated_at = result
                    return ContactOut(
                        id=contact_id,
                        **contact_data.model_dump(),
                        created_by=created_by,
                        created_at=created_at,
                        updated_at=updated_at
                    )
                else:
                    raise Exception("Failed to create contact")
                    
        except Exception as e:
            logging.error(f"Error creating contact: {str(e)}")
            raise

def get_contact(contact_id: UUID) -> Optional[ContactOut]:
    """Get a contact by ID"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, first_name, last_name, email, phone, mobile, company, job_title,
                           contact_type_id, assigned_to, address, notes, is_active,
                           created_by, created_at, updated_at
                    FROM contacts WHERE id = %s
                """, (contact_id,))
                
                result = cur.fetchone()
                if result:
                    return ContactOut(
                        id=result[0], first_name=result[1], last_name=result[2],
                        email=result[3], phone=result[4], mobile=result[5], company=result[6], job_title=result[7],
                        contact_type_id=result[8], assigned_to=result[9], address=result[10],
                        notes=result[11], is_active=result[12], created_by=result[13],
                        created_at=result[14], updated_at=result[15]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error fetching contact: {str(e)}")
            return None

def update_contact(contact_id: UUID, contact_update: ContactUpdate) -> Optional[ContactOut]:
    """Update a contact"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                # Build dynamic update query
                update_fields = []
                values = []
                
                for field, value in contact_update.model_dump(exclude_unset=True).items():
                    if value is not None:
                        update_fields.append(f"{field} = %s")
                        values.append(value)
                
                if not update_fields:
                    return get_contact(contact_id)
                
                update_fields.append("updated_at = %s")
                values.append(datetime.now())
                values.append(contact_id)
                
                cur.execute(f"""
                    UPDATE contacts SET {', '.join(update_fields)}
                    WHERE id = %s
                    RETURNING id, first_name, last_name, email, phone, mobile, company, job_title,
                             contact_type_id, assigned_to, address, notes, is_active,
                             created_by, created_at, updated_at
                """, values)
                
                result = cur.fetchone()
                if result:
                    return ContactOut(
                        id=result[0], first_name=result[1], last_name=result[2],
                        email=result[3], phone=result[4], mobile=result[5], company=result[6], job_title=result[7],
                        contact_type_id=result[8], assigned_to=result[9], address=result[10],
                        notes=result[11], is_active=result[12], created_by=result[13],
                        created_at=result[14], updated_at=result[15]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating contact: {str(e)}")
            return None

def delete_contact(contact_id: UUID) -> bool:
    """Delete a contact and all related records (leads, deals, tasks, communications, activities)."""
    if not DB_ENABLED:
        logging.error("delete_contact: DB not enabled")
        return False
    
    with get_db_connection() as conn:
        if not conn:
            logging.error("delete_contact: No database connection")
            return False
        
        try:
            with conn.cursor() as cur:
                # Check if contact exists first
                cur.execute("SELECT id FROM contacts WHERE id = %s", (str(contact_id),))
                if not cur.fetchone():
                    logging.warning(f"delete_contact: Contact {contact_id} not found")
                    return False
                
                # Get all lead IDs associated with this contact
                cur.execute("SELECT id FROM leads WHERE contact_id = %s", (str(contact_id),))
                lead_ids = [str(row[0]) for row in cur.fetchall()]
                logging.info(f"delete_contact: Found {len(lead_ids)} leads for contact {contact_id}")
                
                # Get all deal IDs associated with this contact
                cur.execute("SELECT id FROM deals WHERE contact_id = %s", (str(contact_id),))
                deal_ids = [str(row[0]) for row in cur.fetchall()]
                logging.info(f"delete_contact: Found {len(deal_ids)} deals for contact {contact_id}")
                
                # Delete lead activities for the leads
                if lead_ids:
                    cur.execute("""
                        DELETE FROM lead_activities 
                        WHERE lead_id = ANY(%s::uuid[])
                    """, (lead_ids,))
                    logging.info(f"delete_contact: Deleted lead activities")
                
                # Delete deal activities for the deals
                if deal_ids:
                    cur.execute("""
                        DELETE FROM deal_activities 
                        WHERE deal_id = ANY(%s::uuid[])
                    """, (deal_ids,))
                    logging.info(f"delete_contact: Deleted deal activities")
                
                # Delete tasks related to this contact
                cur.execute("""
                    DELETE FROM tasks 
                    WHERE related_contact_id = %s
                """, (str(contact_id),))
                logging.info(f"delete_contact: Deleted tasks for contact")
                
                # Delete tasks related to leads being deleted
                if lead_ids:
                    cur.execute("""
                        DELETE FROM tasks 
                        WHERE related_lead_id = ANY(%s::uuid[])
                    """, (lead_ids,))
                    logging.info(f"delete_contact: Deleted tasks for leads")
                
                # Delete tasks related to deals being deleted
                if deal_ids:
                    cur.execute("""
                        DELETE FROM tasks 
                        WHERE related_deal_id = ANY(%s::uuid[])
                    """, (deal_ids,))
                    logging.info(f"delete_contact: Deleted tasks for deals")
                
                # Delete all communications associated with this contact
                cur.execute("""
                    DELETE FROM communications 
                    WHERE to_contact_id = %s
                """, (str(contact_id),))
                logging.info(f"delete_contact: Deleted communications")
                
                # Delete all leads associated with this contact
                if lead_ids:
                    cur.execute("""
                        DELETE FROM leads 
                        WHERE id = ANY(%s::uuid[])
                    """, (lead_ids,))
                    logging.info(f"delete_contact: Deleted leads")
                
                # Delete all deals associated with this contact
                if deal_ids:
                    cur.execute("""
                        DELETE FROM deals 
                        WHERE id = ANY(%s::uuid[])
                    """, (deal_ids,))
                    logging.info(f"delete_contact: Deleted deals")
                
                # Delete contact activities (should cascade, but explicit is better)
                cur.execute("""
                    DELETE FROM contact_activities 
                    WHERE contact_id = %s
                """, (str(contact_id),))
                logging.info(f"delete_contact: Deleted contact activities")
                
                # Finally, delete the contact
                cur.execute("DELETE FROM contacts WHERE id = %s", (str(contact_id),))
                deleted = cur.rowcount > 0
                logging.info(f"delete_contact: Contact deleted: {deleted}")
                return deleted
                
        except Exception as e:
            logging.error(f"delete_contact: Error deleting contact {contact_id}: {str(e)}")
            return False

def list_contacts(skip: int = 0, limit: int = 100, contact_type_id: Optional[int] = None,
                 assigned_to: Optional[UUID] = None, search: Optional[str] = None,
                 is_active: Optional[bool] = None) -> List[ContactOut]:
    """List contacts with optional filtering"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                where_conditions = []
                params = []
                
                if contact_type_id is not None:
                    where_conditions.append("contact_type_id = %s")
                    params.append(contact_type_id)
                
                if assigned_to is not None:
                    where_conditions.append("assigned_to = %s")
                    params.append(assigned_to)
                
                if is_active is not None:
                    where_conditions.append("is_active = %s")
                    params.append(is_active)
                
                if search:
                    where_conditions.append("(first_name ILIKE %s OR last_name ILIKE %s OR email ILIKE %s OR company ILIKE %s OR mobile ILIKE %s)")
                    search_param = f"%{search}%"
                    params.extend([search_param, search_param, search_param, search_param, search_param])
                
                where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
                
                cur.execute(f"""
                    SELECT id, first_name, last_name, email, phone, mobile, company, job_title,
                           contact_type_id, assigned_to, address, notes, is_active,
                           created_by, created_at, updated_at
                    FROM contacts {where_clause}
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, params + [limit, skip])
                
                results = cur.fetchall()
                contacts = []
                for result in results:
                    contacts.append(ContactOut(
                        id=result[0], first_name=result[1], last_name=result[2],
                        email=result[3], phone=result[4], mobile=result[5], company=result[6], job_title=result[7],
                        contact_type_id=result[8], assigned_to=result[9], address=result[10],
                        notes=result[11], is_active=result[12], created_by=result[13],
                        created_at=result[14], updated_at=result[15]
                    ))
                
                return contacts
                
        except Exception as e:
            logging.error(f"Error listing contacts: {str(e)}")
            return []

# ==============================================
# CONTACT ACTIVITY FUNCTIONS
# ==============================================

def create_contact_activity(activity_data: ContactActivityCreate, created_by: UUID) -> ContactActivityOut:
    """Create a new contact activity"""
    if not DB_ENABLED:
        activity_id = UUID('12345678-1234-1234-1234-123456789012')
        return ContactActivityOut(
            id=activity_id,
            contact_id=activity_data.contact_id,
            **activity_data.model_dump(exclude={'contact_id'}),
            created_by=created_by,
            created_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO contact_activities (
                        contact_id, activity_type, subject, description, activity_date, created_by, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (
                    activity_data.contact_id, activity_data.activity_type, activity_data.subject,
                    activity_data.description, activity_data.activity_date or datetime.now(),
                    created_by, datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    activity_id, created_at = result
                    return ContactActivityOut(
                        id=activity_id,
                        contact_id=activity_data.contact_id,
                        **activity_data.model_dump(exclude={'contact_id'}),
                        created_by=created_by,
                        created_at=created_at
                    )
                else:
                    raise Exception("Failed to create contact activity")
                    
        except Exception as e:
            logging.error(f"Error creating contact activity: {str(e)}")
            raise

def get_contact_activities(contact_id: UUID) -> List[ContactActivityOut]:
    """Get all activities for a contact"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, contact_id, activity_type, subject, description, activity_date, created_by, created_at
                    FROM contact_activities WHERE contact_id = %s
                    ORDER BY created_at DESC
                """, (contact_id,))
                
                results = cur.fetchall()
                activities = []
                for result in results:
                    activities.append(ContactActivityOut(
                        id=result[0], contact_id=result[1], activity_type=result[2],
                        subject=result[3], description=result[4], activity_date=result[5],
                        created_by=result[6], created_at=result[7]
                    ))
                
                return activities
                
        except Exception as e:
            logging.error(f"Error fetching contact activities: {str(e)}")
            return []

# ==============================================
# CONTACT TYPE MANAGEMENT FUNCTIONS
# ==============================================

def create_contact_type(type_data: ContactTypeCreate) -> ContactTypeOut:
    """Create a new contact type"""
    if not DB_ENABLED:
        return ContactTypeOut(
            id=1,
            **type_data.model_dump(),
            created_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO contact_types (name, description, is_active, created_at)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, created_at
                """, (type_data.name, type_data.description, type_data.is_active, datetime.now()))
                
                result = cur.fetchone()
                if result:
                    type_id, created_at = result
                    return ContactTypeOut(
                        id=type_id,
                        **type_data.model_dump(),
                        created_at=created_at
                    )
                else:
                    raise Exception("Failed to create contact type")
                    
        except Exception as e:
            logging.error(f"Error creating contact type: {str(e)}")
            raise

def get_contact_types() -> List[ContactTypeOut]:
    """Get all contact types"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, description, is_active, created_at
                    FROM contact_types
                    WHERE is_active = true
                    ORDER BY name
                """)
                
                results = cur.fetchall()
                types = []
                for result in results:
                    types.append(ContactTypeOut(
                        id=result[0], name=result[1], description=result[2],
                        is_active=result[3], created_at=result[4]
                    ))
                
                return types
                
        except Exception as e:
            logging.error(f"Error fetching contact types: {str(e)}")
            return []

def update_contact_type(type_id: int, type_data: ContactTypeCreate) -> Optional[ContactTypeOut]:
    """Update a contact type"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE contact_types SET name = %s, description = %s, is_active = %s
                    WHERE id = %s
                    RETURNING id, name, description, is_active, created_at
                """, (type_data.name, type_data.description, type_data.is_active, type_id))
                
                result = cur.fetchone()
                if result:
                    return ContactTypeOut(
                        id=result[0], name=result[1], description=result[2],
                        is_active=result[3], created_at=result[4]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating contact type: {str(e)}")
            return None

def delete_contact_type(type_id: int) -> bool:
    """Delete a contact type"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM contact_types WHERE id = %s", (type_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting contact type: {str(e)}")
            return False
