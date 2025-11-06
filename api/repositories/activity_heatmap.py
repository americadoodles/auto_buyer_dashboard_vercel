from typing import List
from datetime import datetime, timezone, date, timedelta
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.activity_heatmap import ActivityData, ActivityHeatmapResponse


def get_activity_heatmap_data() -> ActivityHeatmapResponse:
    """Get historical activity data for the heatmap visualization."""
    if not DB_ENABLED:
        return ActivityHeatmapResponse(
            data=[],
            total_activities=0,
            active_days=0,
            average_per_week=0.0
        )

    with get_db_connection() as conn:
        if not conn:
            return ActivityHeatmapResponse(
                data=[],
                total_activities=0,
                active_days=0,
                average_per_week=0.0
            )
        
        try:
            with conn.cursor() as cur:
                # Get data for the last year
                one_year_ago_date = date.today() - timedelta(days=365)
                today_date = date.today()
                
                # Convert to datetime for proper range comparison
                # Start of one_year_ago (beginning of day)
                one_year_ago = datetime.combine(one_year_ago_date, datetime.min.time()).replace(tzinfo=timezone.utc)
                # End of today (end of day) to include all of today's activities
                today = datetime.combine(today_date, datetime.max.time()).replace(tzinfo=timezone.utc)
                
                # Query to get daily activity counts
                cur.execute("""
                    SELECT 
                        DATE(l.created_at) as activity_date,
                        COUNT(*) as daily_count
                    FROM listings l
                    WHERE l.created_at >= %s 
                    AND l.created_at <= %s
                    GROUP BY DATE(l.created_at)
                    ORDER BY activity_date
                """, (one_year_ago, today))
                
                # Create a map of date -> count
                activity_map = {}
                total_activities = 0
                
                for row in cur.fetchall():
                    activity_date, daily_count = row
                    activity_map[activity_date.isoformat()] = daily_count
                    total_activities += daily_count
                
                # Generate data for all days in the range
                data = []
                current_date = one_year_ago_date
                
                while current_date <= today_date:
                    date_str = current_date.isoformat()
                    count = activity_map.get(date_str, 0)
                    
                    # Calculate level based on count (0-4)
                    level = 0
                    if count > 0:
                        # Find max count for normalization
                        max_count = max(activity_map.values()) if activity_map else 1
                        if count <= max_count * 0.25:
                            level = 1
                        elif count <= max_count * 0.5:
                            level = 2
                        elif count <= max_count * 0.75:
                            level = 3
                        else:
                            level = 4
                    
                    data.append(ActivityData(
                        date=date_str,
                        count=count,
                        level=level
                    ))
                    
                    current_date += timedelta(days=1)
                
                # Calculate statistics
                active_days = len([d for d in data if d.count > 0])
                weeks_in_year = 52
                average_per_week = total_activities / weeks_in_year if weeks_in_year > 0 else 0
                
                return ActivityHeatmapResponse(
                    data=data,
                    total_activities=total_activities,
                    active_days=active_days,
                    average_per_week=round(average_per_week, 1)
                )
                
        except Exception as e:
            print(f"Error fetching activity heatmap data: {e}")
            return ActivityHeatmapResponse(
                data=[],
                total_activities=0,
                active_days=0,
                average_per_week=0.0
            )
