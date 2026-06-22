# Listing Management Repository
import json
import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..lib.db.query_builder import QueryBuilder
from ..schemas.listing import (
    ListingUpdate, 
    ListingActivityOut, ListingOut, Decision
)
from ..repositories.repositories import create_decision_from_data

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
                # First, check if the listing exists
                cur.execute("SELECT id FROM listings WHERE id = %s", (listing_id,))
                listing_exists = cur.fetchone()
                
                if not listing_exists:
                    logging.error(f"Listing {listing_id} not found in database")
                    return None
                
                # Build dynamic update query using QueryBuilder
                try:
                    query, params = QueryBuilder.build_update_query(
                        table_name="listings",
                        update_data=update_data.model_dump(exclude_unset=True),
                        where_clause="id = %s",
                        where_params=[listing_id],
                        auto_timestamp=True,
                        updated_by_field="updated_by",
                        updated_by_value=updated_by
                    )
                    query += " RETURNING *"
                except ValueError as e:
                    logging.warning(f"No fields to update for listing {listing_id}: {str(e)}")
                    return None
                
                logging.info(f"Executing query: {query}")
                logging.info(f"With values: {params}")
                
                cur.execute(query, params)
                result = cur.fetchone()
                
                if result:
                    logging.info(f"Update successful for listing {listing_id}")
                    
                    # Log the activity (don't fail if logging fails)
                    try:
                        # Fetch username from users table
                        username = updated_by  # Default to UUID if username not found
                        try:
                            cur.execute(
                                "SELECT username FROM users WHERE id::text = %s",
                                (updated_by,)
                            )
                            user_result = cur.fetchone()
                            if user_result and user_result[0]:
                                username = user_result[0]
                        except Exception as username_error:
                            logging.warning(f"Failed to fetch username for user {updated_by}: {str(username_error)}")
                        
                        log_listing_activity(
                            listing_id=listing_id,
                            activity_type="edit",
                            created_by=updated_by,
                            description=f"Listing updated by {username}"
                        )
                    except Exception as log_error:
                        logging.warning(f"Failed to log activity for listing {listing_id}: {str(log_error)}")
                    
                    # Fetch the complete listing data after update using get_listing_by_id
                    # This ensures we return all fields from ListingOut schema
                    listing = get_listing_by_id(listing_id)
                    if listing:
                        return listing
                    
                    # If get_listing_by_id fails, log error and return None
                    # This should not happen in normal operation, but if it does,
                    # we want to fail rather than return incomplete data
                    logging.error(f"get_listing_by_id returned None after successful update for listing {listing_id}")
                    return None
                else:
                    logging.warning(f"No result returned for listing {listing_id}")
                    return None
                
        except Exception as e:
            logging.error(f"Error updating listing {listing_id}: {str(e)}")
            logging.error(f"Update data: {update_data}")
            return None
    
    return None

def get_contact_for_listing(listing_id: int) -> Optional[Dict[str, Any]]:
    """Get contact information for a listing through leads"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                # Get contact through lead
                query = """
                    SELECT 
                        c.id, c.first_name, c.last_name, c.email, c.phone, c.mobile,
                        c.company, c.job_title, c.address, c.social_profiles, c.preferences, c.notes
                    FROM leads l
                    INNER JOIN contacts c ON l.contact_id = c.id
                    WHERE l.listing_id = %s
                    LIMIT 1
                """
                
                cur.execute(query, (listing_id,))
                result = cur.fetchone()
                
                if result:
                    return {
                        "id": str(result[0]),
                        "first_name": result[1],
                        "last_name": result[2],
                        "email": result[3],
                        "phone": result[4],
                        "mobile": result[5],
                        "company": result[6],
                        "job_title": result[7],
                        "address": result[8],
                        "social_profiles": result[9],
                        "preferences": result[10],
                        "notes": result[11]
                    }
                
                return None
        except Exception as e:
            logging.error(f"Error getting contact for listing {listing_id}: {str(e)}")
            return None

def delete_listing(listing_id: int, deleted_by: str) -> bool:
    """Delete a listing by ID, including related leads and contacts"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
            
        try:
            with conn.cursor() as cur:
                # First, check if the listing exists
                cur.execute("SELECT id FROM listings WHERE id = %s", (listing_id,))
                listing_exists = cur.fetchone()
                
                if not listing_exists:
                    logging.error(f"Listing {listing_id} not found in database")
                    return False
                
                # Find all leads associated with this listing and their contacts
                cur.execute("""
                    SELECT l.id as lead_id, l.contact_id 
                    FROM leads l 
                    WHERE l.listing_id = %s
                """, (listing_id,))
                leads_with_contacts = cur.fetchall()
                
                contact_ids_to_delete = []
                lead_ids_to_delete = []
                
                for row in leads_with_contacts:
                    lead_id = row[0]
                    contact_id = row[1]
                    lead_ids_to_delete.append(lead_id)
                    if contact_id:
                        contact_ids_to_delete.append(contact_id)
                
                logging.info(f"Found {len(lead_ids_to_delete)} leads and {len(contact_ids_to_delete)} contacts to delete for listing {listing_id}")
                
                # Delete lead activities for leads being deleted (cascade may handle this, but be explicit)
                if lead_ids_to_delete:
                    cur.execute("""
                        DELETE FROM lead_activities WHERE lead_id = ANY(%s)
                    """, (lead_ids_to_delete,))
                    logging.info(f"Deleted lead activities for {len(lead_ids_to_delete)} leads")
                
                # Update tasks to unlink from leads being deleted
                if lead_ids_to_delete:
                    cur.execute("""
                        UPDATE tasks SET related_lead_id = NULL WHERE related_lead_id = ANY(%s)
                    """, (lead_ids_to_delete,))
                
                # Update deals to unlink from leads being deleted
                if lead_ids_to_delete:
                    cur.execute("""
                        UPDATE deals SET lead_id = NULL WHERE lead_id = ANY(%s)
                    """, (lead_ids_to_delete,))
                
                # Delete leads associated with this listing
                if lead_ids_to_delete:
                    cur.execute("""
                        DELETE FROM leads WHERE id = ANY(%s)
                    """, (lead_ids_to_delete,))
                    logging.info(f"Deleted {len(lead_ids_to_delete)} leads for listing {listing_id}")
                
                # Delete contacts that were associated with the leads
                # First, remove contact references from other tables
                if contact_ids_to_delete:
                    # Update deals to unlink contacts
                    cur.execute("""
                        UPDATE deals SET contact_id = NULL WHERE contact_id = ANY(%s)
                    """, (contact_ids_to_delete,))
                    
                    # Update tasks to unlink contacts
                    cur.execute("""
                        UPDATE tasks SET related_contact_id = NULL WHERE related_contact_id = ANY(%s)
                    """, (contact_ids_to_delete,))
                    
                    # Delete contact activities (cascade may handle this)
                    cur.execute("""
                        DELETE FROM contact_activities WHERE contact_id = ANY(%s)
                    """, (contact_ids_to_delete,))
                    
                    # Delete the contacts
                    cur.execute("""
                        DELETE FROM contacts WHERE id = ANY(%s)
                    """, (contact_ids_to_delete,))
                    logging.info(f"Deleted {len(contact_ids_to_delete)} contacts for listing {listing_id}")
                
                # Delete related listing activities
                cur.execute("DELETE FROM listing_activities WHERE listing_id = %s", (listing_id,))
                
                # Finally, delete the listing
                cur.execute("DELETE FROM listings WHERE id = %s RETURNING id", (listing_id,))
                result = cur.fetchone()
                
                if result:
                    conn.commit()
                    logging.info(f"Successfully deleted listing {listing_id} by user {deleted_by}")
                    return True
                else:
                    logging.warning(f"No result returned when deleting listing {listing_id}")
                    return False
                
        except Exception as e:
            logging.error(f"Error deleting listing {listing_id}: {str(e)}")
            import traceback
            logging.error(f"Traceback: {traceback.format_exc()}")
            return False
    
    return False

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
                        l.id, l.vehicle_key,
                        COALESCE(l.vin, '') AS vin,
                        l.lpn,
                        l.price, l.miles, l.dom,
                        l.location,
                        l.buyer_id,
                        COALESCE(l.images, ARRAY[]::text[]) AS images,
                        l.transmission,
                        l.interior_color,
                        l.exterior_color,
                        l.fuel_type,
                        l.drivetrain,
                        l.body_style,
                        l.source,
                        l.payload,
                        l.notes,
                        l.updated_at,
                        l.updated_by,
                        l.mmr,
                        l.clean_title,
                        l.condition,
                        l.detailed_ratings,
                        l.engine,
                        l.mpg,
                        l.overall_rating,
                        l.paid_status,
                        c.phone AS phone_number,
                        l.seller_description,
                        c.fb_joined_date AS seller_joined_date,
                        NULLIF(TRIM(COALESCE(c.first_name, '') || ' ' || COALESCE(c.last_name, '')), '') AS seller_name,
                        l.created_at,
                        COALESCE(l.year, 0) AS year,
                        COALESCE(l.make, '') AS make,
                        COALESCE(l.model, '') AS model,
                        l.trim,
                        u.username AS buyer_username,
                        COALESCE(s.score, 0) AS score,
                        s.buy_max,
                        COALESCE(s.reason_codes, ARRAY[]::text[]) AS reason_codes,
                        l.lpn_state
                    FROM listings l
                    LEFT JOIN users u ON u.id::text = l.buyer_id
                    LEFT JOIN contacts c ON c.id = l.contact_id
                    LEFT JOIN (
                        SELECT DISTINCT ON (vin) vin, score, buy_max, reason_codes
                        FROM scores
                        ORDER BY vin, created_at DESC
                    ) s ON s.vin = l.vin
                    WHERE l.id = %s
                """
                
                cur.execute(query, (listing_id,))
                result = cur.fetchone()
                
                if result:
                    # Extract decision data from payload if available
                    decision = None
                    status = ""
                    payload = result[17]  # payload is at index 17 (shifted by 1 due to lpn)
                    if payload:
                        payload_data = json.loads(payload) if isinstance(payload, str) else payload
                        decision = create_decision_from_data(payload_data)
                        status = payload_data.get("status", "")
                    
                    # Parse detailed_ratings JSONB if it's a string
                    detailed_ratings_list = None
                    detailed_ratings = result[24]  # detailed_ratings is at index 24 (shifted by 1 due to lpn)
                    if detailed_ratings:
                        if isinstance(detailed_ratings, str):
                            try:
                                detailed_ratings_list = json.loads(detailed_ratings)
                            except:
                                detailed_ratings_list = None
                        else:
                            detailed_ratings_list = detailed_ratings
                    
                    return ListingOut(
                        id=str(result[0]),
                        vehicle_key=result[1],
                        vin=result[2] or "",
                        lpn=result[3],
                        lpnState=result[42],
                        price=float(result[4]),
                        miles=int(result[5]),
                        dom=int(result[6]),
                        year=int(result[34]),
                        make=result[35],
                        model=result[36],
                        location=result[7],
                        radius=25,  # Default value since radius column doesn't exist in listings table
                        images=result[9] or [],
                        transmission=result[10],
                        exteriorColor=result[12],
                        interiorColor=result[11],
                        fuelType=result[13],
                        overallRating=result[27],
                        detailedRatings=detailed_ratings_list,
                        condition=result[23],
                        mpg=result[26],
                        cleanTitle=result[22],
                        paidStatus=result[28],
                        sellerDescription=result[30],
                        sellerName=result[32],
                        sellerJoinedDate=result[31],
                        phoneNumber=result[29],
                        engine=result[25],
                        driveType=result[14],
                        bodyStyle=result[15],
                        source=result[16],
                        status=status,
                        reasonCodes=result[41] or [],
                        buyMax=float(result[40]) if result[40] is not None else None,
                        trim=result[37],
                        buyer_id=result[8],
                        buyer_username=result[38],
                        decision=decision,
                        created_at=result[33],
                        notes=result[18],
                        updated_at=result[19],
                        updated_by=result[20],
                        score=int(result[39]) if result[39] is not None else None,
                        mmr=float(result[21]) if result[21] is not None else None
                    )
                
        except Exception as e:
            logging.error(f"Error getting listing {listing_id}: {str(e)}")
            logging.error(f"Query: {query}")
            return None
    
    return None

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
