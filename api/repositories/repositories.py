import json
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
                    vin_raw = (norm.get("vin") or "").strip().upper()
                    vin = vin_raw if vin_raw else None

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

                    # vehicles
                    cur.execute("""
                         insert into vehicles (vehicle_key, vin, year, make, model, trim)
                         values (%s,%s,%s,%s,%s,%s)
                         on conflict (vehicle_key) do update set vin=excluded.vin, year=excluded.year, make=excluded.make, model=excluded.model, trim=excluded.trim
                     """, (vehicle_key, vin, norm["year"], make, model, trim))
                    # listings
                    # Convert datetime objects to ISO format strings for JSON serialization
                    payload_data = norm.copy()
                    if "created_at" in payload_data and payload_data["created_at"]:
                        if isinstance(payload_data["created_at"], datetime.datetime):
                            payload_data["created_at"] = payload_data["created_at"].isoformat()

                    # Use buyer_id from authenticated context when provided
                    buyer_from_id = buyer_id or norm.get("buyer") or None

                    cur.execute("""
                      insert into listings (vehicle_key, vin, source, price, miles, dom, location, buyer, payload)
                      values (%s,%s,%s,%s,%s,%s,%s,%s,%s) returning id
                    """, (vehicle_key, vin, norm["source"], norm["price"], norm["miles"], norm["dom"], 
                          norm.get("location"), buyer_from_id, json.dumps(payload_data)))
                    new_id = str(cur.fetchone()[0])
                    out.append(ListingOut(
                        id=new_id, vehicle_key=vehicle_key, vin=vin, year=norm["year"], make=make, model=model,
                        trim=trim, miles=norm["miles"], price=norm["price"], dom=norm["dom"],
                        source=norm["source"], location=norm.get("location"), buyer=buyer_from_id,
                        radius=norm.get("radius", 25), reasonCodes=[],
                        buyMax=None, score=None
                    ))
        finally:
            conn.close()
        return out

    # in-memory fallback
    for item in rows:
        vin = item.vin.strip().upper()
        lid = item.id or f"mem-{len(_BY_ID)+1}"
        obj = ListingOut(
            id=lid, vin=vin, year=item.year, make=item.make.strip(), model=item.model.strip(),
            trim=item.trim.strip() if item.trim else None, miles=item.miles, price=item.price,
            dom=item.dom, source=item.source, location=None, buyer=buyer_id or item.buyer,
            radius=item.radius or 25, reasonCodes=[], buyMax=None
        )
        _BY_ID[lid] = obj
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
                    l.location, l.buyer,
                    COALESCE(s.score, 0) as score, 
                    s.buy_max, 
                    COALESCE(s.reason_codes, ARRAY[]::text[]) as reason_codes
                  FROM listings l
                  LEFT JOIN vehicles v ON v.vehicle_key = l.vehicle_key
                  LEFT JOIN (
                    SELECT DISTINCT ON (vin) vin, score, buy_max, reason_codes
                    FROM scores
                    ORDER BY vin, created_at DESC
                  ) s ON s.vin = l.vin
                  ORDER BY l.vehicle_key, l.created_at DESC
                  LIMIT %s
                """, (limit,))
                out: list[ListingOut] = []
                for rid, vehicle_key, vin, year, make, model, trim, miles, price, dom, source, location, buyer, score, buy_max, reason_codes in cur.fetchall():
                    out.append(ListingOut(
                        id=str(rid), vehicle_key=vehicle_key, vin=vin or "", year=int(year), make=make, model=model, trim=trim,
                        miles=int(miles), price=float(price), dom=int(dom), source=source,
                        location=location, buyer=buyer,
                        radius=25, reasonCodes=reason_codes or [],
                        buyMax=float(buy_max) if buy_max is not None else None,
                        score=int(score) if score is not None else None
                    ))
                return out
        finally:
            conn.close()
    return list(_BY_ID.values())

def update_cached_score(vin: str, score: int, buy_max: float, reasons: list[str]):
    # for in-memory cache parity; DB is handled in scores repo
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
