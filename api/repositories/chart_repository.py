"""
Chart Repository
Handles all chart distribution data queries
"""
from typing import List
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection


def get_sourcing_activities_per_agent() -> List[dict]:
    """Get sourcing activities count per agent (buyer)"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    COALESCE(u.username, l.buyer_id, 'Unknown') as name,
                    COUNT(*) as value
                FROM listings l
                LEFT JOIN users u ON u.id::text = l.buyer_id
                WHERE l.buyer_id IS NOT NULL
                GROUP BY u.username, l.buyer_id
                ORDER BY value DESC
                LIMIT 20
            """)
            
            results = cur.fetchall()
            return [{"name": row[0], "value": int(row[1])} for row in results]


def get_car_categories_performance() -> List[dict]:
    """Get performance metrics grouped by car category (make/model combination)"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        with conn.cursor() as cur:
            # Try to use body_style if available, otherwise use make/model
            cur.execute("""
                SELECT 
                    COALESCE(
                        NULLIF(l.body_style, ''),
                        CONCAT(v.make, ' ', v.model)
                    ) as name,
                    COUNT(*) as value
                FROM listings l
                JOIN vehicles v ON v.vehicle_key = l.vehicle_key
                WHERE v.make IS NOT NULL AND v.model IS NOT NULL
                GROUP BY 
                    COALESCE(
                        NULLIF(l.body_style, ''),
                        CONCAT(v.make, ' ', v.model)
                    )
                ORDER BY value DESC
                LIMIT 20
            """)
            
            results = cur.fetchall()
            return [{"name": row[0] or "Unknown", "value": int(row[1])} for row in results]


def get_states_regions_performance() -> List[dict]:
    """Get performance metrics grouped by state/region extracted from location"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        with conn.cursor() as cur:
            # Extract state from location (format: "City, State" or "City, ST")
            # Try to extract the last part after comma, or use full location if no comma
            cur.execute("""
                SELECT 
                    CASE 
                        WHEN l.location LIKE '%,%' THEN 
                            TRIM(SPLIT_PART(l.location, ',', -1))
                        WHEN l.location IS NOT NULL AND l.location != '' THEN 
                            l.location
                        ELSE 
                            'Unknown'
                    END as name,
                    COUNT(*) as value
                FROM listings l
                WHERE l.location IS NOT NULL AND l.location != ''
                GROUP BY 
                    CASE 
                        WHEN l.location LIKE '%,%' THEN 
                            TRIM(SPLIT_PART(l.location, ',', -1))
                        WHEN l.location IS NOT NULL AND l.location != '' THEN 
                            l.location
                        ELSE 
                            'Unknown'
                    END
                ORDER BY value DESC
                LIMIT 20
            """)
            
            results = cur.fetchall()
            return [{"name": row[0] or "Unknown", "value": int(row[1])} for row in results]

