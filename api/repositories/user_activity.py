from typing import List, Optional
from datetime import datetime, timezone, date
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.user_activity import UserActivityStats, UserActivityResponse


def get_user_activity_stats() -> UserActivityResponse:
    """Get comprehensive user activity statistics including listings count and last activity."""
    if not DB_ENABLED:
        return UserActivityResponse(users=[], total_users=0, active_today=0, total_listings_today=0)

    with get_db_connection() as conn:
        if not conn:
            return UserActivityResponse(users=[], total_users=0, active_today=0, total_listings_today=0)
        
        try:
            with conn.cursor() as cur:
                # Get today's date for filtering
                today = date.today()
                today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
                today_end = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
                
                # Query to get user activity data
                cur.execute("""
                    SELECT 
                        u.id,
                        u.username,
                        u.email,
                        r.name as role,
                        u.is_confirmed,
                        u.last_login,
                        COUNT(l.id) as total_listings,
                        COUNT(CASE WHEN l.created_at >= %s AND l.created_at <= %s THEN 1 END) as today_listings,
                        MAX(l.created_at) as last_activity
                    FROM users u
                    LEFT JOIN roles r ON u.role_id = r.id
                    LEFT JOIN listings l ON u.id::text = l.buyer_id
                    GROUP BY u.id, u.username, u.email, r.name, u.is_confirmed, u.last_login
                    ORDER BY u.username
                """, (today_start, today_end))
                
                users = []
                active_today = 0
                total_listings_today = 0
                
                for row in cur.fetchall():
                    user_id, username, email, role, is_confirmed, last_login, total_listings, today_listings, last_activity = row
                    
                    # Count active users today (users with listings today)
                    if today_listings > 0:
                        active_today += 1
                        total_listings_today += today_listings
                    
                    users.append(UserActivityStats(
                        user_id=user_id,
                        username=username,
                        email=email,
                        role=role or "unknown",
                        is_confirmed=bool(is_confirmed),
                        last_login=last_login,
                        total_listings=total_listings or 0,
                        today_listings=today_listings or 0,
                        last_activity=last_activity
                    ))
                
                return UserActivityResponse(
                    users=users,
                    total_users=len(users),
                    active_today=active_today,
                    total_listings_today=total_listings_today
                )
                
        except Exception as e:
            print(f"Error fetching user activity stats: {e}")
            return UserActivityResponse(users=[], total_users=0, active_today=0, total_listings_today=0)
