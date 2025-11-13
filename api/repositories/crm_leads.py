# CRM Lead Management Repository
import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from psycopg.types.json import Json
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.crm import (
    LeadCreate, LeadUpdate, LeadOut, LeadActivityCreate, LeadActivityOut,
    LeadSourceCreate, LeadSourceOut, LeadStatusCreate, LeadStatusOut,
    LeadSummary, LeadConversionMetrics
)

# ==============================================
# LEAD MANAGEMENT FUNCTIONS
# ==============================================

def create_lead(lead_data: LeadCreate, created_by: UUID) -> LeadOut:
    """Create a new lead"""
    if not DB_ENABLED:
        # Fallback for development
        lead_id = UUID('12345678-1234-1234-1234-123456789012')
        return LeadOut(
            id=lead_id,
            **lead_data.model_dump(),
            created_by=created_by
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO leads (
                        listing_id, contact_id, status_id, source_id, assigned_to,
                        vehicle_interest, budget_range, notes, lead_score, created_by,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW()
                    ) RETURNING id, qualified_at, converted_at, created_at, updated_at
                """, (
                    lead_data.listing_id, lead_data.contact_id, lead_data.status_id,
                    lead_data.source_id, lead_data.assigned_to, 
                    Json(lead_data.vehicle_interest) if lead_data.vehicle_interest else None,
                    Json(lead_data.budget_range) if lead_data.budget_range else None,
                    lead_data.notes, lead_data.lead_score, created_by
                ))
                
                result = cur.fetchone()
                if result:
                    lead_id, qualified_at, converted_at, created_at, updated_at = result
                    return LeadOut(
                        id=lead_id,
                        **lead_data.model_dump(),
                        qualified_at=qualified_at,
                        converted_at=converted_at,
                        created_by=created_by,
                        created_at=created_at,
                        updated_at=updated_at
                    )
                else:
                    raise Exception("Failed to create lead")
                    
        except Exception as e:
            logging.error(f"Error creating lead: {str(e)}")
            raise

def get_lead(lead_id: UUID) -> Optional[LeadOut]:
    """Get a lead by ID"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, listing_id, contact_id, status_id, source_id, assigned_to,
                           vehicle_interest, budget_range, notes, lead_score,
                           qualified_at, converted_at, created_by, created_at, updated_at
                    FROM leads WHERE id = %s
                """, (lead_id,))
                
                result = cur.fetchone()
                if result:
                    return LeadOut(
                        id=result[0], listing_id=result[1], contact_id=result[2],
                        status_id=result[3], source_id=result[4], assigned_to=result[5],
                        vehicle_interest=result[6], budget_range=result[7], notes=result[8],
                        lead_score=result[9], qualified_at=result[10], converted_at=result[11],
                        created_by=result[12], created_at=result[13], updated_at=result[14]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error fetching lead: {str(e)}")
            return None

def update_lead(lead_id: UUID, lead_update: LeadUpdate) -> Optional[LeadOut]:
    """Update a lead"""
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
                
                for field, value in lead_update.model_dump(exclude_unset=True).items():
                    if value is not None:
                        update_fields.append(f"{field} = %s")
                        # Wrap JSONB fields with Json() for psycopg3
                        if field in ('vehicle_interest', 'budget_range'):
                            values.append(Json(value))
                        else:
                            values.append(value)
                
                if not update_fields:
                    return get_lead(lead_id)
                
                update_fields.append("updated_at = NOW()")
                values.append(lead_id)
                
                cur.execute(f"""
                    UPDATE leads SET {', '.join(update_fields)}
                    WHERE id = %s
                    RETURNING id, listing_id, contact_id, status_id, source_id, assigned_to,
                             vehicle_interest, budget_range, notes, lead_score,
                             qualified_at, converted_at, created_by, created_at, updated_at
                """, values)
                
                result = cur.fetchone()
                if result:
                    return LeadOut(
                        id=result[0], listing_id=result[1], contact_id=result[2],
                        status_id=result[3], source_id=result[4], assigned_to=result[5],
                        vehicle_interest=result[6], budget_range=result[7], notes=result[8],
                        lead_score=result[9], qualified_at=result[10], converted_at=result[11],
                        created_by=result[12], created_at=result[13], updated_at=result[14]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating lead: {str(e)}")
            return None

def delete_lead(lead_id: UUID) -> bool:
    """Delete a lead"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM leads WHERE id = %s", (lead_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting lead: {str(e)}")
            return False

def list_leads(skip: int = 0, limit: int = 100, status_id: Optional[int] = None,
               assigned_to: Optional[UUID] = None, search: Optional[str] = None) -> List[LeadOut]:
    """List leads with optional filtering"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                where_conditions = []
                params = []
                
                if status_id is not None:
                    where_conditions.append("l.status_id = %s")
                    params.append(status_id)
                
                if assigned_to is not None:
                    where_conditions.append("l.assigned_to = %s")
                    params.append(assigned_to)
                
                if search:
                    where_conditions.append("(c.first_name ILIKE %s OR c.last_name ILIKE %s OR c.email ILIKE %s OR c.company ILIKE %s)")
                    search_param = f"%{search}%"
                    params.extend([search_param, search_param, search_param, search_param])
                
                where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""
                
                cur.execute(f"""
                    SELECT l.id, l.listing_id, l.contact_id, l.status_id, l.source_id,
                           l.assigned_to, l.vehicle_interest, l.budget_range, l.notes,
                           l.lead_score, l.qualified_at, l.converted_at, l.created_by,
                           l.created_at, l.updated_at
                    FROM leads l
                    LEFT JOIN contacts c ON l.contact_id = c.id
                    {where_clause}
                    ORDER BY l.created_at DESC
                    LIMIT %s OFFSET %s
                """, params + [limit, skip])
                
                results = cur.fetchall()
                leads = []
                for result in results:
                    leads.append(LeadOut(
                        id=result[0], listing_id=result[1], contact_id=result[2],
                        status_id=result[3], source_id=result[4], assigned_to=result[5],
                        vehicle_interest=result[6], budget_range=result[7], notes=result[8],
                        lead_score=result[9], qualified_at=result[10], converted_at=result[11],
                        created_by=result[12], created_at=result[13], updated_at=result[14]
                    ))
                
                return leads
                
        except Exception as e:
            logging.error(f"Error listing leads: {str(e)}")
            return []

# ==============================================
# LEAD ACTIVITY FUNCTIONS
# ==============================================

def create_lead_activity(activity_data: LeadActivityCreate, created_by: UUID) -> LeadActivityOut:
    """Create a new lead activity"""
    if not DB_ENABLED:
        activity_id = UUID('12345678-1234-1234-1234-123456789012')
        return LeadActivityOut(
            id=activity_id,
            lead_id=activity_data.lead_id,
            **activity_data.model_dump(exclude={'lead_id'}),
            created_by=created_by,
            created_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO lead_activities (
                        lead_id, activity_type, subject, description, activity_date, created_by, created_at
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (
                    activity_data.lead_id, activity_data.activity_type, activity_data.subject,
                    activity_data.description, activity_data.activity_date or datetime.now(),
                    created_by, datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    activity_id, created_at = result
                    return LeadActivityOut(
                        id=activity_id,
                        lead_id=activity_data.lead_id,
                        **activity_data.model_dump(exclude={'lead_id'}),
                        created_by=created_by,
                        created_at=created_at
                    )
                else:
                    raise Exception("Failed to create lead activity")
                    
        except Exception as e:
            logging.error(f"Error creating lead activity: {str(e)}")
            raise

def get_lead_activities(lead_id: UUID) -> List[LeadActivityOut]:
    """Get all activities for a lead"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, lead_id, activity_type, subject, description, activity_date, created_by, created_at
                    FROM lead_activities WHERE lead_id = %s
                    ORDER BY created_at DESC
                """, (lead_id,))
                
                results = cur.fetchall()
                activities = []
                for result in results:
                    activities.append(LeadActivityOut(
                        id=result[0], lead_id=result[1], activity_type=result[2],
                        subject=result[3], description=result[4], activity_date=result[5],
                        created_by=result[6], created_at=result[7]
                    ))
                
                return activities
                
        except Exception as e:
            logging.error(f"Error fetching lead activities: {str(e)}")
            return []

# ==============================================
# LEAD SOURCE MANAGEMENT FUNCTIONS
# ==============================================

def create_lead_source(source_data: LeadSourceCreate) -> LeadSourceOut:
    """Create a new lead source"""
    if not DB_ENABLED:
        return LeadSourceOut(
            id=1,
            **source_data.model_dump(),
            created_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO lead_sources (name, description, is_active, created_at)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, created_at
                """, (source_data.name, source_data.description, source_data.is_active, datetime.now()))
                
                result = cur.fetchone()
                if result:
                    source_id, created_at = result
                    return LeadSourceOut(
                        id=source_id,
                        **source_data.model_dump(),
                        created_at=created_at
                    )
                else:
                    raise Exception("Failed to create lead source")
                    
        except Exception as e:
            logging.error(f"Error creating lead source: {str(e)}")
            raise

def get_lead_sources() -> List[LeadSourceOut]:
    """Get all lead sources"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, description, is_active, created_at
                    FROM lead_sources
                    WHERE is_active = true
                    ORDER BY name
                """)
                
                results = cur.fetchall()
                sources = []
                for result in results:
                    sources.append(LeadSourceOut(
                        id=result[0], name=result[1], description=result[2],
                        is_active=result[3], created_at=result[4]
                    ))
                
                return sources
                
        except Exception as e:
            logging.error(f"Error fetching lead sources: {str(e)}")
            return []

def update_lead_source(source_id: int, source_data: LeadSourceCreate) -> Optional[LeadSourceOut]:
    """Update a lead source"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE lead_sources SET name = %s, description = %s, is_active = %s
                    WHERE id = %s
                    RETURNING id, name, description, is_active, created_at
                """, (source_data.name, source_data.description, source_data.is_active, source_id))
                
                result = cur.fetchone()
                if result:
                    return LeadSourceOut(
                        id=result[0], name=result[1], description=result[2],
                        is_active=result[3], created_at=result[4]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating lead source: {str(e)}")
            return None

def delete_lead_source(source_id: int) -> bool:
    """Delete a lead source"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM lead_sources WHERE id = %s", (source_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting lead source: {str(e)}")
            return False

# ==============================================
# LEAD STATUS MANAGEMENT FUNCTIONS
# ==============================================

def create_lead_status(status_data: LeadStatusCreate) -> LeadStatusOut:
    """Create a new lead status"""
    if not DB_ENABLED:
        return LeadStatusOut(
            id=1,
            **status_data.model_dump(),
            created_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO lead_statuses (name, description, color_code, is_active, sort_order, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (status_data.name, status_data.description, status_data.color_code,
                      status_data.is_active, status_data.sort_order, datetime.now()))
                
                result = cur.fetchone()
                if result:
                    status_id, created_at = result
                    return LeadStatusOut(
                        id=status_id,
                        **status_data.model_dump(),
                        created_at=created_at
                    )
                else:
                    raise Exception("Failed to create lead status")
                    
        except Exception as e:
            logging.error(f"Error creating lead status: {str(e)}")
            raise

def get_lead_statuses() -> List[LeadStatusOut]:
    """Get all lead statuses"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, description, color_code, is_active, sort_order, created_at
                    FROM lead_statuses
                    WHERE is_active = true
                    ORDER BY sort_order, name
                """)
                
                results = cur.fetchall()
                statuses = []
                for result in results:
                    statuses.append(LeadStatusOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=result[4], sort_order=result[5],
                        created_at=result[6]
                    ))
                
                return statuses
                
        except Exception as e:
            logging.error(f"Error fetching lead statuses: {str(e)}")
            return []

def update_lead_status(status_id: int, status_data: LeadStatusCreate) -> Optional[LeadStatusOut]:
    """Update a lead status"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE lead_statuses SET name = %s, description = %s, color_code = %s,
                                           is_active = %s, sort_order = %s
                    WHERE id = %s
                    RETURNING id, name, description, color_code, is_active, sort_order, created_at
                """, (status_data.name, status_data.description, status_data.color_code,
                      status_data.is_active, status_data.sort_order, status_id))
                
                result = cur.fetchone()
                if result:
                    return LeadStatusOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=result[4], sort_order=result[5],
                        created_at=result[6]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating lead status: {str(e)}")
            return None

def delete_lead_status(status_id: int) -> bool:
    """Delete a lead status"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM lead_statuses WHERE id = %s", (status_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting lead status: {str(e)}")
            return False

# ==============================================
# LEAD ANALYTICS FUNCTIONS
# ==============================================

def get_lead_summary() -> List[LeadSummary]:
    """Get lead summary from v_lead_summary view"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        id, listing_id, contact_id, contact_name, contact_email, contact_phone,
                        status_name, status_color, source_name, assigned_to_name,
                        vehicle_interest, budget_range, notes, lead_score,
                        qualified_at, converted_at
                    FROM v_lead_summary
                    ORDER BY COALESCE(converted_at, qualified_at, NOW()) DESC
                    LIMIT 100
                """)
                
                results = cur.fetchall()
                summaries = []
                for result in results:
                    summaries.append(LeadSummary(
                        id=result[0], listing_id=result[1], contact_id=result[2],
                        contact_name=result[3], contact_email=result[4], contact_phone=result[5],
                        status_name=result[6], status_color=result[7], source_name=result[8],
                        assigned_to_name=result[9], vehicle_interest=result[10],
                        budget_range=result[11], notes=result[12], lead_score=result[13],
                        qualified_at=result[14], converted_at=result[15]
                    ))
                
                return summaries
                
        except Exception as e:
            logging.error(f"Error fetching lead summary: {str(e)}")
            return []

def get_lead_conversion_metrics() -> LeadConversionMetrics:
    """Get lead conversion metrics"""
    if not DB_ENABLED:
        return LeadConversionMetrics(
            total_leads=0, converted_leads=0,
            conversion_rate=0.0, avg_score=0.0
        )
    
    with get_db_connection() as conn:
        if not conn:
            return LeadConversionMetrics(
                total_leads=0, converted_leads=0,
                conversion_rate=0.0, avg_score=0.0
            )
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT 
                        COUNT(*) as total_leads,
                        COUNT(CASE WHEN converted_at IS NOT NULL THEN 1 END) as converted_leads,
                        AVG(lead_score) as avg_score
                    FROM leads
                """)
                
                result = cur.fetchone()
                if result:
                    total_leads, converted_leads, avg_score = result
                    conversion_rate = (converted_leads / total_leads * 100) if total_leads > 0 else 0.0
                    
                    return LeadConversionMetrics(
                        total_leads=total_leads,
                        converted_leads=converted_leads,
                        conversion_rate=conversion_rate,
                        avg_score=float(avg_score) if avg_score else 0.0
                    )
                
                return LeadConversionMetrics(
                    total_leads=0, converted_leads=0,
                    conversion_rate=0.0, avg_score=0.0
                )
                
        except Exception as e:
            logging.error(f"Error fetching lead conversion metrics: {str(e)}")
            return LeadConversionMetrics(
                total_leads=0, converted_leads=0,
                conversion_rate=0.0, avg_score=0.0
            )
