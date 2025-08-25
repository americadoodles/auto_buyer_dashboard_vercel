from core.db import get_conn, DB_ENABLED

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
