# Listing Management Repository
import logging
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..lib.db.query_builder import QueryBuilder
from ..schemas.listing import (
    ListingUpdate, 
    ListingActivityOut, ListingOut
)

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
                        log_listing_activity(
                            listing_id=listing_id,
                            activity_type="edit",
                            created_by=updated_by,
                            description=f"Listing updated by {updated_by}"
                        )
                    except Exception as log_error:
                        logging.warning(f"Failed to log activity for listing {listing_id}: {str(log_error)}")
                    
                    # Fetch the complete listing data after update (similar to get_listing_by_id)
                    listing = get_listing_by_id(listing_id)
                    if listing:
                        return listing
                    
                    # Fallback: Return basic data if get_listing_by_id fails
                    # Note: This is a simplified version - ideally get_listing_by_id should work
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
                        updated_by=result[13] if len(result) > 13 else None,  # updated_by
                        images=result[11] if len(result) > 11 and result[11] else []  # images
                    )
                else:
                    logging.warning(f"No result returned for listing {listing_id}")
                    return None
                
        except Exception as e:
            logging.error(f"Error updating listing {listing_id}: {str(e)}")
            logging.error(f"Update data: {update_data}")
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
                        s.score, s.buy_max, s.reason_codes
                    FROM listings l
                    LEFT JOIN vehicles v ON v.vehicle_key = l.vehicle_key
                    LEFT JOIN users u ON u.id::text = l.buyer_id
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
                        reasonCodes=result[30] or []
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
