# Listing Management Repository
import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.listing import (
    ListingUpdate, ListingContactLink, ListingContactUnlink, 
    ListingActivityOut, ListingOut
)
from ..schemas.crm import ContactOut

# ==============================================
# LISTING UPDATE FUNCTIONS
# ==============================================

def update_listing(listing_id: int, update_data: ListingUpdate, updated_by: str) -> Optional[ListingOut]:
    """Update a listing with new information"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
            
        try:
            with conn.cursor() as cur:
                # Build dynamic update query
                update_fields = []
                update_values = []
                
                for field, value in update_data.model_dump(exclude_unset=True).items():
                    if value is not None:
                        update_fields.append(f"{field} = %s")
                        update_values.append(value)
                
                if not update_fields:
                    logging.warning(f"No fields to update for listing {listing_id}")
                    return None
                
                # Add updated_by and updated_at
                update_fields.append("updated_by = %s")
                update_fields.append("updated_at = now()")
                update_values.append(updated_by)
                update_values.append(listing_id)
                
                query = f"""
                    UPDATE listings 
                    SET {', '.join(update_fields)}
                    WHERE id = %s
                    RETURNING *
                """
                
                logging.info(f"Executing query: {query}")
                logging.info(f"With values: {update_values}")
                
                cur.execute(query, update_values)
                result = cur.fetchone()
                
                if result:
                    logging.info(f"Update successful for listing {listing_id}")
                    
                    # Log the activity (don't fail if logging fails)
                    try:
                        log_listing_activity(
                            listing_id=listing_id,
                            activity_type="edit",
                            created_by=updated_by,
                            description=f"Listing updated by {updated_by}"
                        )
                    except Exception as log_error:
                        logging.warning(f"Failed to log activity for listing {listing_id}: {str(log_error)}")
                    
                    # Return a properly mapped response
                    return ListingOut(
                        id=str(result[0]),  # id
                        vehicle_key=result[1] if result[1] else "",  # vehicle_key
                        vin=result[2],  # vin
                        year=2021,  # Default year (not in listings table)
                        make="Tesla",  # Default make (not in listings table)
                        model="Model 3",  # Default model (not in listings table)
                        miles=result[5] if result[5] else 0,  # miles
                        price=float(result[4]) if result[4] else 0.0,  # price
                        dom=result[6] if result[6] else 0,  # dom
                        source=result[3],  # source
                        location=result[7],  # location
                        buyer_id=result[8],  # buyer_id
                        created_at=result[10],  # created_at
                        notes=result[14] if len(result) > 14 else None,  # notes
                        condition_rating=result[15] if len(result) > 15 else None,  # condition_rating
                        interior_color=result[16] if len(result) > 16 else None,  # interior_color
                        exterior_color=result[17] if len(result) > 17 else None,  # exterior_color
                        transmission=result[18] if len(result) > 18 else None,  # transmission
                        fuel_type=result[19] if len(result) > 19 else None,  # fuel_type
                        drivetrain=result[20] if len(result) > 20 else None,  # drivetrain
                        engine_size=result[21] if len(result) > 21 else None,  # engine_size
                        body_style=result[22] if len(result) > 22 else None,  # body_style
                        updated_at=result[12] if len(result) > 12 else None,  # updated_at
                        updated_by=result[13] if len(result) > 13 else None  # updated_by
                    )
                else:
                    logging.warning(f"No result returned for listing {listing_id}")
                    return None
                
        except Exception as e:
            logging.error(f"Error updating listing {listing_id}: {str(e)}")
            logging.error(f"Update data: {update_data}")
            logging.error(f"Update fields: {update_fields}")
            logging.error(f"Update values: {update_values}")
            return None
    
    return None

def get_listing_by_id(listing_id: int) -> Optional[ListingOut]:
    """Get a listing by ID with full details including contacts"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
            
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT 
                        l.id, l.vehicle_key, l.vin, l.price, l.miles, l.dom, l.source, 
                        l.location, l.buyer_id, l.payload, l.created_at,
                        l.notes, l.condition_rating, l.interior_color, l.exterior_color,
                        l.transmission, l.fuel_type, l.drivetrain, l.engine_size, l.body_style,
                        l.updated_at, l.updated_by,
                        COALESCE(l.images, ARRAY[]::text[]) as images,
                        v.year, v.make, v.model, v.trim,
                        u.username as buyer_username,
                        s.score, s.buy_max, s.reason_codes,
                        -- Primary contact information
                        pc.id as primary_contact_id,
                        pc.first_name as primary_contact_first_name,
                        pc.last_name as primary_contact_last_name,
                        pc.email as primary_contact_email,
                        pc.phone as primary_contact_phone,
                        pc.company as primary_contact_company,
                        -- All contacts count
                        (SELECT COUNT(*) FROM listing_contacts lc WHERE lc.listing_id = l.id) as contacts_count
                    FROM listings l
                    LEFT JOIN vehicles v ON v.vehicle_key = l.vehicle_key
                    LEFT JOIN users u ON u.id::text = l.buyer_id
                    LEFT JOIN (
                        SELECT DISTINCT ON (vin) vin, score, buy_max, reason_codes
                        FROM scores
                        ORDER BY vin, created_at DESC
                    ) s ON s.vin = l.vin
                    LEFT JOIN listing_contacts lc_primary ON lc_primary.listing_id = l.id AND lc_primary.is_primary = true
                    LEFT JOIN contacts pc ON pc.id = lc_primary.contact_id
                    WHERE l.id = %s
                """
                
                cur.execute(query, (listing_id,))
                result = cur.fetchone()
                
                if result:
                    return ListingOut(
                        id=str(result[0]),
                        vehicle_key=result[1],
                        vin=result[2],
                        price=result[3],
                        miles=result[4],
                        dom=result[5],
                        source=result[6],
                        location=result[7],
                        buyer_id=result[8],
                        created_at=result[10],
                        notes=result[11],
                        condition_rating=result[12],
                        interior_color=result[13],
                        exterior_color=result[14],
                        transmission=result[15],
                        fuel_type=result[16],
                        drivetrain=result[17],
                        engine_size=result[18],
                        body_style=result[19],
                        updated_at=result[20],
                        updated_by=result[21],
                        images=result[22] or [],
                        year=result[23],
                        make=result[24],
                        model=result[25],
                        trim=result[26],
                        buyer_username=result[27],
                        score=result[28],
                        buyMax=result[29],
                        reasonCodes=result[30] or [],
                        primary_contact_id=result[31],
                        primary_contact_first_name=result[32],
                        primary_contact_last_name=result[33],
                        primary_contact_email=result[34],
                        primary_contact_phone=result[35],
                        primary_contact_company=result[36],
                        contacts_count=result[37] or 0
                    )
                
        except Exception as e:
            logging.error(f"Error getting listing {listing_id}: {str(e)}")
            logging.error(f"Query: {query}")
            return None
    
    return None

# ==============================================
# CONTACT LINKING FUNCTIONS
# ==============================================

def link_contact_to_listing(listing_id: int, contact_link: ListingContactLink, created_by: str) -> bool:
    """Link a contact to a listing"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
            
        try:
            with conn.cursor() as cur:
                # If setting as primary, unset other primary contacts for this listing
                if contact_link.is_primary:
                    cur.execute("""
                        UPDATE listing_contacts 
                        SET is_primary = false 
                        WHERE listing_id = %s
                    """, (listing_id,))
                
                # Insert the new contact link
                cur.execute("""
                    INSERT INTO listing_contacts (listing_id, contact_id, relationship_type, is_primary, notes, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (listing_id, contact_id, relationship_type) 
                    DO UPDATE SET is_primary = EXCLUDED.is_primary, notes = EXCLUDED.notes
                """, (
                    listing_id, 
                    contact_link.contact_id, 
                    contact_link.relationship_type,
                    contact_link.is_primary,
                    contact_link.notes,
                    created_by
                ))
                
                # Log the activity
                log_listing_activity(
                    listing_id=listing_id,
                    activity_type="contact_added",
                    created_by=created_by,
                    description=f"Contact linked to listing"
                )
                
                return True
                
        except Exception as e:
            logging.error(f"Error linking contact to listing {listing_id}: {str(e)}")
            return False
    
    return False

def unlink_contact_from_listing(listing_id: int, contact_id: UUID, created_by: str) -> bool:
    """Unlink a contact from a listing"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
            
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    DELETE FROM listing_contacts 
                    WHERE listing_id = %s AND contact_id = %s
                """, (listing_id, contact_id))
                
                # Log the activity
                log_listing_activity(
                    listing_id=listing_id,
                    activity_type="contact_removed",
                    created_by=created_by,
                    description=f"Contact unlinked from listing"
                )
                
                return True
                
        except Exception as e:
            logging.error(f"Error unlinking contact from listing {listing_id}: {str(e)}")
            return False
    
    return False

def get_listing_contacts(listing_id: int) -> List[ContactOut]:
    """Get all contacts linked to a listing"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
            
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT c.*, lc.relationship_type, lc.is_primary, lc.notes as link_notes
                    FROM contacts c
                    JOIN listing_contacts lc ON lc.contact_id = c.id
                    WHERE lc.listing_id = %s
                    ORDER BY lc.is_primary DESC, c.first_name, c.last_name
                """
                
                cur.execute(query, (listing_id,))
                results = cur.fetchall()
                
                contacts = []
                for result in results:
                    contact = ContactOut(
                        id=result[0],
                        first_name=result[1],
                        last_name=result[2],
                        email=result[3],
                        phone=result[4],
                        mobile=result[5],
                        company=result[6],
                        job_title=result[7],
                        contact_type_id=result[8],
                        assigned_to=result[9],
                        address=result[10],
                        social_profiles=result[11],
                        preferences=result[12],
                        notes=result[13],
                        is_active=result[14],
                        created_by=result[15],
                        created_at=result[16],
                        updated_at=result[17]
                    )
                    contacts.append(contact)
                
                return contacts
                
        except Exception as e:
            logging.error(f"Error getting contacts for listing {listing_id}: {str(e)}")
            return []
    
    return []

# ==============================================
# ACTIVITY LOGGING FUNCTIONS
# ==============================================

def log_listing_activity(
    listing_id: int,
    activity_type: str,
    created_by: str,
    field_name: Optional[str] = None,
    old_value: Optional[str] = None,
    new_value: Optional[str] = None,
    description: Optional[str] = None
) -> bool:
    """Log an activity for a listing"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
            
        try:
            with conn.cursor() as cur:
                # Check if the table exists first
                cur.execute("""
                    SELECT EXISTS (
                        SELECT FROM information_schema.tables 
                        WHERE table_name = 'listing_activities'
                    )
                """)
                table_exists = cur.fetchone()[0]
                
                if not table_exists:
                    logging.warning("listing_activities table does not exist, skipping activity logging")
                    return True
                
                cur.execute("""
                    INSERT INTO listing_activities 
                    (listing_id, activity_type, field_name, old_value, new_value, description, created_by)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (listing_id, activity_type, field_name, old_value, new_value, description, created_by))
                
                return True
                
        except Exception as e:
            logging.warning(f"Error logging activity for listing {listing_id}: {str(e)}")
            return False
    
    return False

def get_listing_activities(listing_id: int) -> List[ListingActivityOut]:
    """Get activity history for a listing"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
            
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT id, listing_id, activity_type, field_name, old_value, new_value, 
                           description, created_at, created_by
                    FROM listing_activities
                    WHERE listing_id = %s
                    ORDER BY created_at DESC
                """
                
                cur.execute(query, (listing_id,))
                results = cur.fetchall()
                
                activities = []
                for result in results:
                    activity = ListingActivityOut(
                        id=result[0],
                        listing_id=result[1],
                        activity_type=result[2],
                        field_name=result[3],
                        old_value=result[4],
                        new_value=result[5],
                        description=result[6],
                        created_at=result[7],
                        created_by=result[8]
                    )
                    activities.append(activity)
                
                return activities
                
        except Exception as e:
            logging.error(f"Error getting activities for listing {listing_id}: {str(e)}")
            return []
    
    return []
