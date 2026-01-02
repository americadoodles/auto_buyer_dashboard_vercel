import json
import logging
from typing import List, Optional, Any
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.accu_trade import AccuTradeDataIn, AccuTradeDataOut, AccuTradeDataUpdate, AccuTradeDataStatus, AccuTradeDataStatus

logger = logging.getLogger(__name__)


def _parse_jsonb(value: Any) -> Optional[dict]:
    """Parse JSONB value from PostgreSQL - handles both dict and string formats"""
    if value is None:
        return None
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        return json.loads(value)
    return None


def ingest_accu_trade_data(data: AccuTradeDataIn) -> AccuTradeDataStatus:
    """Create or update AccuTrade data for a VIN (upsert operation)"""
    if not DB_ENABLED:
        logger.warning("Database not enabled, skipping accu_trade_data ingestion")
        return AccuTradeDataStatus(success=False, status_code=503)
    
    with get_db_connection() as conn:
        if not conn:
            logger.error("No database connection available")
            return AccuTradeDataStatus(success=False, status_code=503)
        
        try:
            with conn.cursor() as cur:
                # Normalize VIN
                vin = data.vin.strip().upper() if data.vin else None
                if not vin:
                    logger.error("VIN is required for accu_trade_data")
                    return AccuTradeDataStatus(success=False, status_code=400)
                
                # Check if record exists for this VIN
                cur.execute("SELECT id FROM accu_trade_data WHERE vin = %s", (vin,))
                existing = cur.fetchone()
                
                if existing:
                    # Update existing record
                    record_id = existing[0]
                    cur.execute("""
                        UPDATE accu_trade_data
                        SET options = %s,
                            pricebar = %s,
                            local_market_listing = %s,
                            local_market_stats = %s,
                            updated_at = NOW()
                        WHERE id = %s
                    """, (
                        json.dumps(data.options) if data.options else None,
                        json.dumps(data.pricebar) if data.pricebar else None,
                        json.dumps(data.localMarketListing) if data.localMarketListing else None,
                        json.dumps(data.localMarketStats) if data.localMarketStats else None,
                        record_id
                    ))
                else:
                    # Insert new record
                    cur.execute("""
                        INSERT INTO accu_trade_data (vin, options, pricebar, local_market_listing, local_market_stats)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        vin,
                        json.dumps(data.options) if data.options else None,
                        json.dumps(data.pricebar) if data.pricebar else None,
                        json.dumps(data.localMarketListing) if data.localMarketListing else None,
                        json.dumps(data.localMarketStats) if data.localMarketStats else None
                    ))
                
                conn.commit()
                return AccuTradeDataStatus(success=True, status_code=200)
                    
        except Exception as e:
            logger.error(f"Error ingesting accu_trade_data: {e}", exc_info=True)
            conn.rollback()
            return AccuTradeDataStatus(success=False, status_code=500)


def get_accu_trade_data_by_vin(vin: str) -> Optional[AccuTradeDataOut]:
    """Get AccuTrade data by VIN"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                vin_normalized = vin.strip().upper() if vin else None
                if not vin_normalized:
                    return None
                
                cur.execute("""
                    SELECT id, vin, options, pricebar, local_market_listing, local_market_stats, created_at, updated_at
                    FROM accu_trade_data
                    WHERE vin = %s
                """, (vin_normalized,))
                
                row = cur.fetchone()
                if row:
                    return AccuTradeDataOut(
                        id=row[0],
                        vin=row[1],
                        options=_parse_jsonb(row[2]),
                        pricebar=_parse_jsonb(row[3]),
                        local_market_listing=_parse_jsonb(row[4]),
                        local_market_stats=_parse_jsonb(row[5]),
                        created_at=row[6],
                        updated_at=row[7]
                    )
                return None
                
        except Exception as e:
            logger.error(f"Error getting accu_trade_data by VIN: {e}", exc_info=True)
            return None


def get_accu_trade_data_by_id(record_id: int) -> Optional[AccuTradeDataOut]:
    """Get AccuTrade data by ID"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, vin, options, pricebar, local_market_listing, local_market_stats, created_at, updated_at
                    FROM accu_trade_data
                    WHERE id = %s
                """, (record_id,))
                
                row = cur.fetchone()
                if row:
                    return AccuTradeDataOut(
                        id=row[0],
                        vin=row[1],
                        options=_parse_jsonb(row[2]),
                        pricebar=_parse_jsonb(row[3]),
                        local_market_listing=_parse_jsonb(row[4]),
                        local_market_stats=_parse_jsonb(row[5]),
                        created_at=row[6],
                        updated_at=row[7]
                    )
                return None
                
        except Exception as e:
            logger.error(f"Error getting accu_trade_data by ID: {e}", exc_info=True)
            return None


def list_accu_trade_data(limit: Optional[int] = None, offset: Optional[int] = None) -> List[AccuTradeDataOut]:
    """List all AccuTrade data with optional pagination"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT id, vin, options, pricebar, local_market_listing, local_market_stats, created_at, updated_at
                    FROM accu_trade_data
                    ORDER BY updated_at DESC
                """
                params = []
                
                if limit is not None:
                    query += " LIMIT %s"
                    params.append(limit)
                
                if offset is not None:
                    query += " OFFSET %s"
                    params.append(offset)
                
                cur.execute(query, tuple(params))
                rows = cur.fetchall()
                
                result = []
                for row in rows:
                    result.append(AccuTradeDataOut(
                        id=row[0],
                        vin=row[1],
                        options=_parse_jsonb(row[2]),
                        pricebar=_parse_jsonb(row[3]),
                        local_market_listing=_parse_jsonb(row[4]),
                        local_market_stats=_parse_jsonb(row[5]),
                        created_at=row[6],
                        updated_at=row[7]
                    ))
                
                return result
                
        except Exception as e:
            logger.error(f"Error listing accu_trade_data: {e}", exc_info=True)
            return []


def update_accu_trade_data(record_id: int, data: AccuTradeDataUpdate) -> Optional[AccuTradeDataOut]:
    """Update AccuTrade data by ID"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                # Build update query dynamically based on provided fields
                updates = []
                params = []
                
                if data.options is not None:
                    updates.append("options = %s")
                    params.append(json.dumps(data.options))
                
                if data.pricebar is not None:
                    updates.append("pricebar = %s")
                    params.append(json.dumps(data.pricebar))
                
                if data.localMarketListing is not None:
                    updates.append("local_market_listing = %s")
                    params.append(json.dumps(data.localMarketListing))
                
                if data.localMarketStats is not None:
                    updates.append("local_market_stats = %s")
                    params.append(json.dumps(data.localMarketStats))
                
                if not updates:
                    # No fields to update, just return the existing record
                    return get_accu_trade_data_by_id(record_id)
                
                updates.append("updated_at = NOW()")
                params.append(record_id)
                
                query = f"""
                    UPDATE accu_trade_data
                    SET {', '.join(updates)}
                    WHERE id = %s
                    RETURNING id, vin, options, pricebar, local_market_listing, local_market_stats, created_at, updated_at
                """
                
                cur.execute(query, tuple(params))
                row = cur.fetchone()
                
                if row:
                    conn.commit()
                    return AccuTradeDataOut(
                        id=row[0],
                        vin=row[1],
                        options=_parse_jsonb(row[2]),
                        pricebar=_parse_jsonb(row[3]),
                        local_market_listing=_parse_jsonb(row[4]),
                        local_market_stats=_parse_jsonb(row[5]),
                        created_at=row[6],
                        updated_at=row[7]
                    )
                else:
                    conn.rollback()
                    return None
                    
        except Exception as e:
            logger.error(f"Error updating accu_trade_data: {e}", exc_info=True)
            conn.rollback()
            return None


def delete_accu_trade_data(record_id: int) -> bool:
    """Delete AccuTrade data by ID"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM accu_trade_data WHERE id = %s", (record_id,))
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
                
        except Exception as e:
            logger.error(f"Error deleting accu_trade_data: {e}", exc_info=True)
            conn.rollback()
            return False


def delete_accu_trade_data_by_vin(vin: str) -> bool:
    """Delete AccuTrade data by VIN"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                vin_normalized = vin.strip().upper() if vin else None
                if not vin_normalized:
                    return False
                
                cur.execute("DELETE FROM accu_trade_data WHERE vin = %s", (vin_normalized,))
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
                
        except Exception as e:
            logger.error(f"Error deleting accu_trade_data by VIN: {e}", exc_info=True)
            conn.rollback()
            return False
