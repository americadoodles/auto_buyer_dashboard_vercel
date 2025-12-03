"""
KPI Repository
Handles KPI metrics and trends calculations
"""
import datetime
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection


def get_trends_data(days_back: int = 30) -> dict:
    """Get trend data comparing current period vs previous period"""
    if not DB_ENABLED:
        return {
            "total_listings": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            "average_price": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            "conversion_rate": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            "active_buyers": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            "average_profit": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            "aged_inventory": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
        }
    
    with get_db_connection() as conn:
        if not conn:
            return {
                "total_listings": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
                "average_price": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
                "conversion_rate": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
                "active_buyers": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
                "average_profit": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
                "aged_inventory": {"current": 0, "previous": 0, "trend": 0, "trend_up": False},
            }
        
        with conn.cursor() as cur:
            # Calculate date ranges
            cur.execute("SELECT NOW() as now")
            now = cur.fetchone()[0]
            
            # Current period: last N days
            current_start = now - datetime.timedelta(days=days_back)
            # Previous period: N days before that
            previous_start = now - datetime.timedelta(days=days_back * 2)
            previous_end = current_start
            
            # Query for current period metrics
            cur.execute("""
                SELECT 
                    COUNT(*) as total_listings,
                    AVG(l.price) as avg_price,
                    COUNT(DISTINCT l.buyer_id) as active_buyers,
                    COUNT(CASE WHEN s.score IS NOT NULL THEN 1 END) as scored_listings,
                    COUNT(CASE WHEN l.created_at < %s THEN 1 END) as aged_inventory
                FROM listings l
                LEFT JOIN (
                    SELECT DISTINCT ON (vin) vin, score
                    FROM scores
                    ORDER BY vin, created_at DESC
                ) s ON s.vin = l.vin
                WHERE l.created_at >= %s
            """, (now - datetime.timedelta(days=30), current_start))
            
            current_result = cur.fetchone()
            current_total, current_avg_price, current_buyers, current_scored, current_aged = current_result or (0, 0, 0, 0, 0)
            current_conversion = (current_scored / current_total * 100) if current_total > 0 else 0
            current_profit = float(current_avg_price) * 0.15 if current_avg_price else 0
            
            # Query for previous period metrics
            cur.execute("""
                SELECT 
                    COUNT(*) as total_listings,
                    AVG(l.price) as avg_price,
                    COUNT(DISTINCT l.buyer_id) as active_buyers,
                    COUNT(CASE WHEN s.score IS NOT NULL THEN 1 END) as scored_listings,
                    COUNT(CASE WHEN l.created_at < %s THEN 1 END) as aged_inventory
                FROM listings l
                LEFT JOIN (
                    SELECT DISTINCT ON (vin) vin, score
                    FROM scores
                    ORDER BY vin, created_at DESC
                ) s ON s.vin = l.vin
                WHERE l.created_at >= %s AND l.created_at < %s
            """, (now - datetime.timedelta(days=30), previous_start, previous_end))
            
            previous_result = cur.fetchone()
            previous_total, previous_avg_price, previous_buyers, previous_scored, previous_aged = previous_result or (0, 0, 0, 0, 0)
            previous_conversion = (previous_scored / previous_total * 100) if previous_total > 0 else 0
            previous_profit = float(previous_avg_price) * 0.15 if previous_avg_price else 0
            
            def calculate_trend(current: float, previous: float) -> tuple[float, bool]:
                if previous == 0:
                    return (100.0 if current > 0 else 0.0, current > 0)
                change = ((current - previous) / previous) * 100
                return (abs(change), change > 0)
            
            # Calculate trends for each metric
            total_trend, total_up = calculate_trend(current_total, previous_total)
            price_trend, price_up = calculate_trend(current_avg_price or 0, previous_avg_price or 0)
            conversion_trend, conversion_up = calculate_trend(current_conversion, previous_conversion)
            buyers_trend, buyers_up = calculate_trend(current_buyers, previous_buyers)
            profit_trend, profit_up = calculate_trend(current_profit, previous_profit)
            aged_trend, aged_up = calculate_trend(current_aged, previous_aged)
            
            return {
                "total_listings": {
                    "current": int(current_total),
                    "previous": int(previous_total),
                    "trend": round(total_trend, 1),
                    "trend_up": total_up
                },
                "average_price": {
                    "current": round(float(current_avg_price or 0), 2),
                    "previous": round(float(previous_avg_price or 0), 2),
                    "trend": round(price_trend, 1),
                    "trend_up": price_up
                },
                "conversion_rate": {
                    "current": round(current_conversion, 1),
                    "previous": round(previous_conversion, 1),
                    "trend": round(conversion_trend, 1),
                    "trend_up": conversion_up
                },
                "active_buyers": {
                    "current": int(current_buyers),
                    "previous": int(previous_buyers),
                    "trend": round(buyers_trend, 1),
                    "trend_up": buyers_up
                },
                "average_profit": {
                    "current": round(current_profit, 2),
                    "previous": round(previous_profit, 2),
                    "trend": round(profit_trend, 1),
                    "trend_up": profit_up
                },
                "aged_inventory": {
                    "current": int(current_aged),
                    "previous": int(previous_aged),
                    "trend": round(aged_trend, 1),
                    "trend_up": aged_up
                }
            }


def get_kpi_metrics() -> dict:
    """Get comprehensive KPI metrics for the dashboard"""
    if not DB_ENABLED:
        return {
            "average_profit_per_unit": 0.0,
            "lead_to_purchase_time": 0.0,
            "aged_inventory": 0,
            "total_listings": 0,
            "active_buyers": 0,
            "conversion_rate": 0.0,
            "average_price": 0.0,
            "total_value": 0.0,
            "scoring_rate": 0.0,
            "average_score": 0.0
        }
    
    with get_db_connection() as conn:
        if not conn:
            return {
                "average_profit_per_unit": 0.0,
                "lead_to_purchase_time": 0.0,
                "aged_inventory": 0,
                "total_listings": 0,
                "active_buyers": 0,
                "conversion_rate": 0.0,
                "average_price": 0.0,
                "total_value": 0.0,
                "scoring_rate": 0.0,
                "average_score": 0.0
            }
        
        with conn.cursor() as cur:
            # Get current timestamp for calculations
            cur.execute("SELECT NOW() as now")
            now = cur.fetchone()[0]
            
            # Calculate 30 days ago for aged inventory
            thirty_days_ago = now - datetime.timedelta(days=30)
            
            # Main metrics query
            cur.execute("""
                SELECT 
                    COUNT(*) as total_listings,
                    COALESCE(AVG(l.price), 0) as average_price,
                    COALESCE(SUM(l.price), 0) as total_value,
                    COUNT(DISTINCT l.buyer_id) as active_buyers,
                    COUNT(CASE WHEN s.score IS NOT NULL THEN 1 END) as scored_listings,
                    COALESCE(AVG(CASE WHEN s.score IS NOT NULL THEN s.score ELSE NULL END), 0) as average_score,
                    COUNT(CASE WHEN l.created_at < %s THEN 1 END) as aged_inventory,
                    COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - l.created_at)) / 86400), 0) as avg_days_since_creation
                FROM listings l
                LEFT JOIN (
                    SELECT DISTINCT ON (vin) vin, score
                    FROM scores
                    ORDER BY vin, created_at DESC
                ) s ON s.vin = l.vin
            """, (thirty_days_ago,))
            
            result = cur.fetchone()
            if not result:
                return {
                    "average_profit_per_unit": 0.0,
                    "lead_to_purchase_time": 0.0,
                    "aged_inventory": 0,
                    "total_listings": 0,
                    "active_buyers": 0,
                    "conversion_rate": 0.0,
                    "average_price": 0.0,
                    "total_value": 0.0,
                    "scoring_rate": 0.0,
                    "average_score": 0.0
                }
            
            (total_listings, average_price, total_value, active_buyers, 
             scored_listings, average_score, aged_inventory, avg_days_since_creation) = result
            
            # Calculate derived metrics
            average_profit_per_unit = float(average_price) * 0.15  # 15% margin
            lead_to_purchase_time = float(avg_days_since_creation) if avg_days_since_creation else 0.0
            conversion_rate = (scored_listings / total_listings * 100) if total_listings > 0 else 0.0
            scoring_rate = (scored_listings / total_listings * 100) if total_listings > 0 else 0.0
            
            return {
                "average_profit_per_unit": round(float(average_profit_per_unit), 2),
                "lead_to_purchase_time": round(float(lead_to_purchase_time), 1),
                "aged_inventory": int(aged_inventory),
                "total_listings": int(total_listings),
                "active_buyers": int(active_buyers),
                "conversion_rate": round(float(conversion_rate), 1),
                "average_price": round(float(average_price), 2),
                "total_value": round(float(total_value), 2),
                "scoring_rate": round(float(scoring_rate), 1),
                "average_score": round(float(average_score), 1)
            }

