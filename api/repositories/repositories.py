import json
from typing import List, Optional
from ..core.db import get_conn, DB_ENABLED
from ..schemas.listing import ListingIn, ListingOut

# In-memory fallback for listings
_BY_ID: dict[str, ListingOut] = {}
_IDS_BY_VIN: dict[str, list[str]] = {}

# ============================================================================
# LISTINGS REPOSITORY
# ============================================================================

def ingest_listings(rows: List[ListingIn]) -> List[ListingOut]:
    out: list[ListingOut] = []
    if DB_ENABLED:
        conn = get_conn(); assert conn is not None
        try:
            with conn, conn.cursor() as cur:
                for item in rows:
                    norm = item.model_dump()
                    vin = norm["vin"].strip().upper()
                    make = norm["make"].strip(); model = norm["model"].strip()
                    trim = (norm["trim"] or None)
                    # vehicles
                    cur.execute("""
                      insert into vehicles (vin, year, make, model, trim)
                      values (%s,%s,%s,%s,%s)
                      on conflict (vin) do update set year=excluded.year, make=excluded.make, model=excluded.model, trim=excluded.trim
                    """, (vin, norm["year"], make, model, trim))
                    # listings
                    # Convert datetime objects to ISO format strings for JSON serialization
                    payload_data = norm.copy()
                    if "created_at" in payload_data and payload_data["created_at"]:
                        if hasattr(payload_data["created_at"], "isoformat"):
                            payload_data["created_at"] = payload_data["created_at"].isoformat()
                    
                    cur.execute("""
                      insert into listings (vin, source, price, miles, dom, payload)
                      values (%s,%s,%s,%s,%s,%s) returning id
                    """, (vin, norm["source"], norm["price"], norm["miles"], norm["dom"], json.dumps(payload_data)))
                    new_id = str(cur.fetchone()[0])
                    out.append(ListingOut(
                        id=new_id, vin=vin, year=norm["year"], make=make, model=model,
                        trim=trim, miles=norm["miles"], price=norm["price"], dom=norm["dom"],
                        source=norm["source"], radius=norm.get("radius", 25), reasonCodes=[],
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
            dom=item.dom, source=item.source, radius=item.radius or 25, reasonCodes=[], buyMax=None
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
                cur.execute("""
                  select l.id, l.vin, coalesce(v.year,0), coalesce(v.make,''), coalesce(v.model,''), v.trim,
                         l.miles, l.price, l.dom, l.source, s.score, s.buy_max, s.reason_codes
                  from listings l
                  left join vehicles v on v.vin = l.vin
                  left join v_latest_scores s on s.vin = l.vin
                  order by l.created_at desc
                  limit %s
                """, (limit,))
                out: list[ListingOut] = []
                for rid, vin, year, make, model, trim, miles, price, dom, source, score, buy_max, reason_codes in cur.fetchall():
                    out.append(ListingOut(
                        id=str(rid), vin=vin, year=int(year), make=make, model=model, trim=trim,
                        miles=int(miles), price=float(price), dom=int(dom), source=source,
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

def insert_score(vin: str, score: int, buy_max: float, reasons: list[str]):
    if not DB_ENABLED:
        return
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
              insert into scores (vin, score, buy_max, reason_codes)
              values (%s,%s,%s,%s)
            """, (vin, score, buy_max, reasons or ["Heuristic"]))
    finally:
        conn.close()

# ============================================================================
# VEHICLES REPOSITORY
# ============================================================================

def upsert_vehicle(vin: str, year: int, make: str, model: str, trim: str | None):
    if not DB_ENABLED: return
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
            insert into vehicles (vin, year, make, model, trim)
            values (%s,%s,%s,%s,%s)
            on conflict (vin) do update set year=excluded.year, make=excluded.make, model=excluded.model, trim=excluded.trim
            """, (vin, year, make, model, trim))
    finally:
        conn.close()
