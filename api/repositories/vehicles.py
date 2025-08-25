from core.db import get_conn, DB_ENABLED

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
