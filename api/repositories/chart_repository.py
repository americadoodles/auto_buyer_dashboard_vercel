"""
Chart Repository
Handles all chart distribution data queries
"""
from typing import List, Dict, Any
from datetime import datetime, timedelta
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection

STATE_ABBREVIATIONS = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY'
}

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
    """Get performance metrics grouped by car make (brand)"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        with conn.cursor() as cur:
            # Group by make (brand) only
            cur.execute("""
                SELECT 
                    v.make as name,
                    COUNT(*) as value
                FROM listings l
                JOIN vehicles v ON v.vehicle_key = l.vehicle_key
                WHERE v.make IS NOT NULL AND v.make != ''
                GROUP BY v.make
                ORDER BY value DESC
                LIMIT 20
            """)
            
            results = cur.fetchall()
            return [{"name": row[0] or "Unknown", "value": int(row[1])} for row in results]


def format_location_abbreviation(location: str) -> str:
    """Convert location format from 'City, State' to 'City Abbr, ST'"""
    if not location or ',' not in location:
        return 'Unknown'
    
    parts = [p.strip() for p in location.split(',')]
    if len(parts) < 2:
        return 'Unknown'
    
    city = parts[0]
    state = parts[1].lower()
    
    # Get abbreviation or return Unknown if not found
    state_abbr = STATE_ABBREVIATIONS.get(state)
    
    if state_abbr is None:
        return 'Unknown'
    
    return f"{city}, {state_abbr}"


def get_states_regions_performance() -> List[dict]:
    """Get performance metrics grouped by state/region extracted from location"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    l.location,
                    COUNT(*) as value
                FROM listings l
                WHERE l.location IS NOT NULL AND l.location != ''
                GROUP BY l.location
                ORDER BY value DESC
                LIMIT 20
            """)
            
            results = cur.fetchall()
            
            # Format locations on the Python side
            formatted_results = []
            for row in results:
                formatted_location = format_location_abbreviation(row[0])
                formatted_results.append({
                    "name": formatted_location,
                    "value": int(row[1])
                })
            
            return formatted_results


def get_lead_to_purchase_funnel(start_date: datetime = None, end_date: datetime = None) -> List[Dict[str, Any]]:
    """Get lead to purchase funnel data (conversions over time)
    
    Returns time series data showing conversions (leads converted to deals or deals won)
    grouped by date.
    """
    if not DB_ENABLED:
        return []
    
    # Default to last 30 days if no dates provided
    if not end_date:
        end_date = datetime.now()
    if not start_date:
        start_date = end_date - timedelta(days=30)
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        with conn.cursor() as cur:
            # Get conversions from leads (converted_at) and deals (is_won with actual_close_date)
            # Combine both sources to show the full funnel
            cur.execute("""
                SELECT 
                    DATE(conversion_date) as date,
                    COUNT(*) as value
                FROM (
                    -- Leads that were converted
                    SELECT converted_at as conversion_date
                    FROM leads
                    WHERE converted_at IS NOT NULL
                        AND converted_at >= %s
                        AND converted_at <= %s
                    
                    UNION ALL
                    
                    -- Deals that were won (purchases)
                    SELECT actual_close_date::timestamp as conversion_date
                    FROM deals
                    WHERE is_won = true
                        AND actual_close_date IS NOT NULL
                        AND actual_close_date >= %s::date
                        AND actual_close_date <= %s::date
                ) conversions
                GROUP BY DATE(conversion_date)
                ORDER BY date ASC
            """, (start_date, end_date, start_date.date(), end_date.date()))
            
            results = cur.fetchall()
            
            # Convert to list of dicts with date as ISO string
            funnel_data = []
            for row in results:
                date_obj = row[0]
                if isinstance(date_obj, datetime):
                    date_str = date_obj.date().isoformat()
                else:
                    date_str = str(date_obj)
                funnel_data.append({
                    "date": date_str,
                    "value": int(row[1])
                })
            
            return funnel_data


def get_lead_source_performance() -> List[dict]:
    """Get lead source performance (distribution of leads by source)"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        with conn.cursor() as cur:
            cur.execute("""
                SELECT 
                    COALESCE(ls.name, 'Unknown') as name,
                    COUNT(*) as value
                FROM leads l
                LEFT JOIN lead_sources ls ON l.source_id = ls.id
                GROUP BY ls.name
                ORDER BY value DESC
                LIMIT 20
            """)
            
            results = cur.fetchall()
            return [{"name": row[0] or "Unknown", "value": int(row[1])} for row in results]

