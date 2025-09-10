import json
import logging
from typing import List, Optional
from ..core.db import get_conn, DB_ENABLED
from ..schemas.listing import ListingIn, ListingOut
import datetime

# In-memory fallback for listings
_BY_ID: dict[str, ListingOut] = {}
_IDS_BY_VIN: dict[str, list[str]] = {}

# ============================================================================
# LISTINGS REPOSITORY
# ============================================================================

def ingest_listings(rows: List[ListingIn], buyer_id: Optional[str] = None) -> List[ListingOut]:
    out: list[ListingOut] = []
    if DB_ENABLED:
        conn = get_conn(); assert conn is not None
        try:
            with conn, conn.cursor() as cur:
                for item in rows:
                    norm = item.model_dump()
                    vin_raw = norm.get("vin")
                    vin = vin_raw.strip().upper() if vin_raw and vin_raw.strip() else None

                    def make_vehicle_key(n):
                        if vin:
                            return vin
                        # unique by timestamp when VIN missing; include source to be extra safe
                        created = (n.get("created_at") or datetime.utcnow())
                        src = (n.get("source") or "unknown").strip().lower()
                        return f"{src}#{created.isoformat(timespec='milliseconds')}"

                    vehicle_key = make_vehicle_key(norm)
                    make = norm["make"].strip()
                    model = norm["model"].strip()
                    trim = (norm["trim"] or None)

                    # Handle external API data: map status, reasonCodes, buyMax to Decision object
                    decision = None
                    if norm.get("status") or norm.get("reasonCodes") or norm.get("buyMax"):
                        from ..schemas.listing import Decision
                        decision = Decision(
                            status=norm.get("status", ""),
                            reasons=norm.get("reasonCodes", []),
                            buyMax=float(norm.get("buyMax", 0)) if norm.get("buyMax") is not None else 0
                        )

                    # vehicles
                    cur.execute("""
                         insert into vehicles (vehicle_key, vin, year, make, model, trim)
                         values (%s,%s,%s,%s,%s,%s)
                         on conflict (vehicle_key) do update set vin=excluded.vin, year=excluded.year, make=excluded.make, model=excluded.model, trim=excluded.trim
                     """, (vehicle_key, vin, norm["year"], make, model, trim))
                    
                    # Store decision data in scores table if provided
                    if decision and vin:
                        try:
                            cur.execute("""
                                insert into scores (vehicle_key, vin, score, buy_max, reason_codes)
                                values (%s, %s, %s, %s, %s)
                            """, (vehicle_key, vin, 0, decision.buyMax, decision.reasons))
                        except Exception as log_exc:
                            logging.error(f"Failed to insert score data: {log_exc}")
                    
                    # listings
                    # Convert datetime objects to ISO format strings for JSON serialization
                    payload_data = norm.copy()
                    if "created_at" in payload_data and payload_data["created_at"]:
                        if isinstance(payload_data["created_at"], datetime.datetime):
                            payload_data["created_at"] = payload_data["created_at"].isoformat()

                    # Use buyer_id from authenticated context when provided; fallback to incoming buyer_id
                    buyer_from_id = buyer_id or norm.get("buyer_id") or None

                    # Prefer writing to buyer_id column;
                    try:
                        cur.execute("""
                          insert into listings (vehicle_key, vin, source, price, miles, dom, location, buyer_id, payload)
                          values (%s,%s,%s,%s,%s,%s,%s,%s,%s) returning id
                        """, (vehicle_key, vin, norm["source"], norm["price"], norm["miles"], norm["dom"], 
                              norm.get("location"), buyer_from_id, json.dumps(payload_data)))
                    except Exception as log_exc:
                        logging.error(f"Failed to insert listing into database: {log_exc}")
                    new_id = str(cur.fetchone()[0])
                    
                    # Extract reasonCodes and buyMax for ListingOut
                    reason_codes = norm.get("reasonCodes", [])
                    buy_max = float(norm.get("buyMax", 0)) if norm.get("buyMax") is not None else None
                    
                    out.append(ListingOut(
                        id=new_id, vehicle_key=vehicle_key, vin=vin, year=norm["year"], make=make, model=model,
                        trim=trim, miles=norm["miles"], price=norm["price"], dom=norm["dom"],
                        source=norm["source"], location=norm.get("location"), buyer_id=buyer_from_id,
                        radius=norm.get("radius", 25), reasonCodes=reason_codes,
                        buyMax=buy_max, score=None, decision=decision
                    ))
        finally:
            conn.close()
        return out

    # in-memory fallback
    for item in rows:
        norm = item.model_dump()
        vin = item.vin.strip().upper() if item.vin and item.vin.strip() else None
        
        # Handle external API data: map status, reasonCodes, buyMax to Decision object
        decision = None
        if norm.get("status") or norm.get("reasonCodes") or norm.get("buyMax"):
            from ..schemas.listing import Decision
            decision = Decision(
                status=norm.get("status", ""),
                reasons=norm.get("reasonCodes", []),
                buyMax=float(norm.get("buyMax", 0)) if norm.get("buyMax") is not None else 0
            )
        
        lid = item.id or f"mem-{len(_BY_ID)+1}"
        reason_codes = norm.get("reasonCodes", [])
        buy_max = float(norm.get("buyMax", 0)) if norm.get("buyMax") is not None else None
        
        obj = ListingOut(
            id=lid, vin=vin, year=item.year, make=item.make.strip(), model=item.model.strip(),
            trim=item.trim.strip() if item.trim else None, miles=item.miles, price=item.price,
            dom=item.dom, source=item.source, location=norm.get("location"), buyer_id=buyer_id or item.buyer_id,
            radius=item.radius or 25, reasonCodes=reason_codes, buyMax=buy_max, decision=decision
        )
        _BY_ID[lid] = obj
        if vin:
            _IDS_BY_VIN.setdefault(vin, []).append(lid)
        out.append(obj)
    return out

def list_listings(limit: int = 500) -> list[ListingOut]:
    if DB_ENABLED:
        conn = get_conn(); assert conn is not None
        try:
            with conn, conn.cursor() as cur:
                # Fixed query to prevent duplicates by using DISTINCT ON and proper JOINs
                cur.execute("""
                  SELECT DISTINCT ON (l.vehicle_key) 
                    l.id, l.vehicle_key, 
                    COALESCE(l.vin, '') AS vin, 
                    COALESCE(v.year, 0) as year, 
                    COALESCE(v.make, '') as make, 
                    COALESCE(v.model, '') as model, 
                    v.trim,
                    l.miles, l.price, l.dom, l.source, 
                    l.location, l.buyer_id,
                    u.username as buyer_username,
                    COALESCE(s.score, 0) as score, 
                    s.buy_max, 
                    COALESCE(s.reason_codes, ARRAY[]::text[]) as reason_codes,
                    l.payload
                  FROM listings l
                  LEFT JOIN vehicles v ON v.vehicle_key = l.vehicle_key
                  LEFT JOIN (
                    SELECT DISTINCT ON (vin) vin, score, buy_max, reason_codes
                    FROM scores
                    ORDER BY vin, created_at DESC
                  ) s ON s.vin = l.vin
                  LEFT JOIN users u ON u.id::text = l.buyer_id
                  ORDER BY l.vehicle_key, l.created_at DESC
                  LIMIT %s
                """, (limit,))
                out: list[ListingOut] = []
                for rid, vehicle_key, vin, year, make, model, trim, miles, price, dom, source, location, buyer_id, buyer_username, score, buy_max, reason_codes, payload in cur.fetchall():
                    # Extract decision data from payload if available
                    decision = None
                    if payload:
                        payload_data = json.loads(payload) if isinstance(payload, str) else payload
                        if payload_data.get("status") or payload_data.get("reasonCodes") or payload_data.get("buyMax"):
                            from ..schemas.listing import Decision
                            decision = Decision(
                                status=payload_data.get("status", ""),
                                reasons=payload_data.get("reasonCodes", []),
                                buyMax=float(payload_data.get("buyMax", 0)) if payload_data.get("buyMax") is not None else 0
                            )
                    
                    out.append(ListingOut(
                        id=str(rid), vehicle_key=vehicle_key, vin=vin or "", year=int(year), make=make, model=model, trim=trim,
                        miles=int(miles), price=float(price), dom=int(dom), source=source,
                        location=location, buyer_id=buyer_id, buyer_username=buyer_username,
                        radius=25, reasonCodes=reason_codes or [],
                        buyMax=float(buy_max) if buy_max is not None else None,
                        score=int(score) if score is not None else None, decision=decision
                    ))
                return out
        except Exception as e:
            logging.error(f"Error in list_listings: {str(e)}")
            raise
        finally:
            conn.close()
    return list(_BY_ID.values())

def list_listings_by_buyer(buyer_id: str, start_date: Optional[datetime.datetime] = None, end_date: Optional[datetime.datetime] = None, limit: int = 500) -> list[ListingOut]:
    """Get listings for a specific buyer with optional date filtering"""
    if DB_ENABLED:
        conn = get_conn(); assert conn is not None
        try:
            with conn, conn.cursor() as cur:
                # Build query with optional date filtering
                base_query = """
                  SELECT 
                    l.id, l.vehicle_key, 
                    COALESCE(l.vin, '') AS vin, 
                    COALESCE(v.year, 0) as year, 
                    COALESCE(v.make, '') as make, 
                    COALESCE(v.model, '') as model, 
                    v.trim,
                    l.miles, l.price, l.dom, l.source, 
                    l.location, l.buyer_id,
                    u.username as buyer_username,
                    COALESCE(s.score, 0) as score, 
                    s.buy_max, 
                    COALESCE(s.reason_codes, ARRAY[]::text[]) as reason_codes,
                    l.created_at,
                    l.payload
                  FROM listings l
                  LEFT JOIN vehicles v ON v.vehicle_key = l.vehicle_key
                  LEFT JOIN (
                    SELECT DISTINCT ON (vin) vin, score, buy_max, reason_codes
                    FROM scores
                    ORDER BY vin, created_at DESC
                  ) s ON s.vin = l.vin
                  LEFT JOIN users u ON u.id::text = l.buyer_id
                  WHERE l.buyer_id = %s
                """
                
                params = [buyer_id]
                
                if start_date:
                    base_query += " AND l.created_at >= %s"
                    params.append(start_date)
                
                if end_date:
                    base_query += " AND l.created_at <= %s"
                    params.append(end_date)
                
                base_query += " ORDER BY l.created_at DESC LIMIT %s"
                params.append(limit)
                
                cur.execute(base_query, params)
                out: list[ListingOut] = []
                for rid, vehicle_key, vin, year, make, model, trim, miles, price, dom, source, location, buyer_id, buyer_username, score, buy_max, reason_codes, created_at, payload in cur.fetchall():
                    # Extract decision data from payload if available
                    decision = None
                    if payload:
                        payload_data = json.loads(payload) if isinstance(payload, str) else payload
                        if payload_data.get("status") or payload_data.get("reasonCodes") or payload_data.get("buyMax"):
                            from ..schemas.listing import Decision
                            decision = Decision(
                                status=payload_data.get("status", ""),
                                reasons=payload_data.get("reasonCodes", []),
                                buyMax=float(payload_data.get("buyMax", 0)) if payload_data.get("buyMax") is not None else 0
                            )
                    
                    out.append(ListingOut(
                        id=str(rid), vehicle_key=vehicle_key, vin=vin or "", year=int(year), make=make, model=model, trim=trim,
                        miles=int(miles), price=float(price), dom=int(dom), source=source,
                        location=location, buyer_id=buyer_id, buyer_username=buyer_username,
                        radius=25, reasonCodes=reason_codes or [],
                        buyMax=float(buy_max) if buy_max is not None else None,
                        score=int(score) if score is not None else None, decision=decision
                    ))
                return out
        finally:
            conn.close()
    # Fallback to in-memory filtering
    return [listing for listing in _BY_ID.values() if listing.buyer_id == buyer_id]

def get_buyer_stats(buyer_id: str, start_date: Optional[datetime.datetime] = None, end_date: Optional[datetime.datetime] = None) -> dict:
    """Get performance statistics for a specific buyer"""
    if DB_ENABLED:
        conn = get_conn(); assert conn is not None
        try:
            with conn, conn.cursor() as cur:
                # Base query for buyer stats
                base_query = """
                  SELECT 
                    COUNT(*) as total_listings,
                    COUNT(CASE WHEN s.score IS NOT NULL THEN 1 END) as scored_listings,
                    AVG(CASE WHEN s.score IS NOT NULL THEN s.score ELSE NULL END) as avg_score,
                    AVG(l.price) as avg_price,
                    MIN(l.created_at) as first_listing,
                    MAX(l.created_at) as last_listing,
                    COUNT(DISTINCT l.source) as unique_sources
                  FROM listings l
                  LEFT JOIN (
                    SELECT DISTINCT ON (vin) vin, score, buy_max, reason_codes
                    FROM scores
                    ORDER BY vin, created_at DESC
                  ) s ON s.vin = l.vin
                  WHERE l.buyer_id = %s
                """
                
                params = [buyer_id]
                
                if start_date:
                    base_query += " AND l.created_at >= %s"
                    params.append(start_date)
                
                if end_date:
                    base_query += " AND l.created_at <= %s"
                    params.append(end_date)
                
                cur.execute(base_query, params)
                result = cur.fetchone()
                
                if result:
                    total_listings, scored_listings, avg_score, avg_price, first_listing, last_listing, unique_sources = result
                    return {
                        "total_listings": total_listings or 0,
                        "scored_listings": scored_listings or 0,
                        "avg_score": float(avg_score) if avg_score else 0,
                        "avg_price": float(avg_price) if avg_price else 0,
                        "first_listing": first_listing.isoformat() if first_listing else None,
                        "last_listing": last_listing.isoformat() if last_listing else None,
                        "unique_sources": unique_sources or 0,
                        "scoring_rate": (scored_listings / total_listings * 100) if total_listings > 0 else 0
                    }
                return {}
        finally:
            conn.close()
    return {}

def update_cached_score(vin: str, score: int, buy_max: float, reasons: list[str]):
    # for in-memory cache parity; DB is handled in scores repo
    if vin:
        for lid in _IDS_BY_VIN.get(vin, []):
            if lid in _BY_ID:
                obj = _BY_ID[lid]
                obj.score = score
                obj.buyMax = buy_max
                obj.reasonCodes = reasons or ["Heuristic"]
                _BY_ID[lid] = obj

# ============================================================================
# SCORES REPOSITORY
# ============================================================================

def insert_score(vehicle_key: str, vin: str, score: int, buy_max: float, reasons: list[str]):
    if not DB_ENABLED:
        return
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
              insert into scores (vehicle_key, vin, score, buy_max, reason_codes)
              values (%s,%s,%s,%s,%s)
            """, (vehicle_key, vin, score, buy_max, reasons or ["Heuristic"]))
    finally:
        conn.close()

# ============================================================================
# VEHICLES REPOSITORY
# ============================================================================

def upsert_vehicle(vehicle_key: str, vin: str, year: int, make: str, model: str, trim: str | None):
    if not DB_ENABLED: return
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
            insert into vehicles (vehicle_key, vin, year, make, model, trim)
            values (%s,%s,%s,%s,%s,%s)
            on conflict (vehicle_key) do update set vin=excluded.vin, year=excluded.year, make=excluded.make, model=excluded.model, trim=excluded.trim
            """, (vehicle_key, vin, year, make, model, trim))
    finally:
        conn.close()

# ============================================================================
# TRENDS REPOSITORY
# ============================================================================

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
    
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
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
    finally:
        conn.close()


# ============================================================================
# KPI REPOSITORY
# ============================================================================

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
    
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
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
    finally:
        conn.close()