import json
import logging
from typing import List, Optional, Any
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.mmr import MMRDataIn, MMRDataOut, MMRDataUpdate, MMRDataStatus

logger = logging.getLogger(__name__)


def _parse_jsonb(value: Any) -> Optional[Any]:
    """Parse JSONB value from PostgreSQL - handles both dict/list and string formats"""
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            logger.error(f"Failed to decode JSON string: {value}")
            return None
    return None


def ingest_mmr_data(data: MMRDataIn) -> MMRDataStatus:
    """Create or update MMR data for a VIN (upsert operation)"""
    if not DB_ENABLED:
        logger.warning("Database not enabled, skipping mmr_data ingestion")
        return MMRDataStatus(success=False, status_code=503)
    
    with get_db_connection() as conn:
        if not conn:
            logger.error("No database connection available")
            return MMRDataStatus(success=False, status_code=503)
        
        try:
            with conn.cursor() as cur:
                # Normalize VIN
                vin = data.vin.strip().upper() if data.vin else None
                if not vin:
                    logger.error("VIN is required for mmr_data")
                    return MMRDataStatus(success=False, status_code=400)
                
                # Check if record exists for this VIN
                cur.execute("SELECT id FROM mmr_data WHERE vin = %s", (vin,))
                existing = cur.fetchone()
                
                if existing:
                    # Update existing record
                    record_id = existing[0]
                    cur.execute("""
                        UPDATE mmr_data
                        SET features = %s,
                            transactions = %s,
                            historical_average = %s,
                            projected_average = %s,
                            estimated_retail = %s,
                            updated_at = NOW()
                        WHERE id = %s
                    """, (
                        json.dumps(data.features) if data.features else None,
                        json.dumps(data.transactions) if data.transactions else None,
                        json.dumps(data.historicalAverage) if data.historicalAverage else None,
                        json.dumps(data.projectedAverage) if data.projectedAverage else None,
                        json.dumps(data.estimatedRetail) if data.estimatedRetail else None,
                        record_id
                    ))
                else:
                    # Insert new record
                    cur.execute("""
                        INSERT INTO mmr_data (vin, features, transactions, historical_average, projected_average, estimated_retail)
                        VALUES (%s, %s, %s, %s, %s, %s)
                    """, (
                        vin,
                        json.dumps(data.features) if data.features else None,
                        json.dumps(data.transactions) if data.transactions else None,
                        json.dumps(data.historicalAverage) if data.historicalAverage else None,
                        json.dumps(data.projectedAverage) if data.projectedAverage else None,
                        json.dumps(data.estimatedRetail) if data.estimatedRetail else None
                    ))
                
                conn.commit()
                return MMRDataStatus(success=True, status_code=200)
                    
        except Exception as e:
            logger.error(f"Error ingesting mmr_data: {e}", exc_info=True)
            if conn:
                conn.rollback()
            return MMRDataStatus(success=False, status_code=500)


def get_mmr_data_by_vin(vin: str) -> Optional[MMRDataOut]:
    """Get MMR data by VIN"""
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
                    SELECT id, vin, features, transactions, historical_average, projected_average, estimated_retail, created_at, updated_at
                    FROM mmr_data
                    WHERE vin = %s
                """, (vin_normalized,))
                
                row = cur.fetchone()
                if row:
                    return MMRDataOut(
                        id=row[0],
                        vin=row[1],
                        features=_parse_jsonb(row[2]),
                        transactions=_parse_jsonb(row[3]),
                        historical_average=_parse_jsonb(row[4]),
                        projected_average=_parse_jsonb(row[5]),
                        estimated_retail=_parse_jsonb(row[6]),
                        created_at=row[7],
                        updated_at=row[8]
                    )
                return None
                
        except Exception as e:
            logger.error(f"Error getting mmr_data by VIN: {e}", exc_info=True)
            return None


def get_mmr_data_by_id(record_id: int) -> Optional[MMRDataOut]:
    """Get MMR data by ID"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, vin, features, transactions, historical_average, projected_average, estimated_retail, created_at, updated_at
                    FROM mmr_data
                    WHERE id = %s
                """, (record_id,))
                
                row = cur.fetchone()
                if row:
                    return MMRDataOut(
                        id=row[0],
                        vin=row[1],
                        features=_parse_jsonb(row[2]),
                        transactions=_parse_jsonb(row[3]),
                        historical_average=_parse_jsonb(row[4]),
                        projected_average=_parse_jsonb(row[5]),
                        estimated_retail=_parse_jsonb(row[6]),
                        created_at=row[7],
                        updated_at=row[8]
                    )
                return None
                
        except Exception as e:
            logger.error(f"Error getting mmr_data by ID: {e}", exc_info=True)
            return None


def list_mmr_data(limit: Optional[int] = None, offset: Optional[int] = None) -> List[MMRDataOut]:
    """List all MMR data with optional pagination"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                query = """
                    SELECT id, vin, features, transactions, historical_average, projected_average, estimated_retail, created_at, updated_at
                    FROM mmr_data
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
                    result.append(MMRDataOut(
                        id=row[0],
                        vin=row[1],
                        features=_parse_jsonb(row[2]),
                        transactions=_parse_jsonb(row[3]),
                        historical_average=_parse_jsonb(row[4]),
                        projected_average=_parse_jsonb(row[5]),
                        estimated_retail=_parse_jsonb(row[6]),
                        created_at=row[7],
                        updated_at=row[8]
                    ))
                
                return result
                
        except Exception as e:
            logger.error(f"Error listing mmr_data: {e}", exc_info=True)
            return []


def update_mmr_data(record_id: int, data: MMRDataUpdate) -> Optional[MMRDataOut]:
    """Update MMR data by ID"""
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
                
                if data.features is not None:
                    updates.append("features = %s")
                    params.append(json.dumps(data.features))
                
                if data.transactions is not None:
                    updates.append("transactions = %s")
                    params.append(json.dumps(data.transactions))
                
                if data.historicalAverage is not None:
                    updates.append("historical_average = %s")
                    params.append(json.dumps(data.historicalAverage))
                
                if data.projectedAverage is not None:
                    updates.append("projected_average = %s")
                    params.append(json.dumps(data.projectedAverage))
                
                if data.estimatedRetail is not None:
                    updates.append("estimated_retail = %s")
                    params.append(json.dumps(data.estimatedRetail))
                
                if not updates:
                    # No fields to update, just return the existing record
                    return get_mmr_data_by_id(record_id)
                
                updates.append("updated_at = NOW()")
                params.append(record_id)
                
                query = f"""
                    UPDATE mmr_data
                    SET {', '.join(updates)}
                    WHERE id = %s
                    RETURNING id, vin, features, transactions, historical_average, projected_average, estimated_retail, created_at, updated_at
                """
                
                cur.execute(query, tuple(params))
                row = cur.fetchone()
                
                if row:
                    conn.commit()
                    return MMRDataOut(
                        id=row[0],
                        vin=row[1],
                        features=_parse_jsonb(row[2]),
                        transactions=_parse_jsonb(row[3]),
                        historical_average=_parse_jsonb(row[4]),
                        projected_average=_parse_jsonb(row[5]),
                        estimated_retail=_parse_jsonb(row[6]),
                        created_at=row[7],
                        updated_at=row[8]
                    )
                else:
                    conn.rollback()
                    return None
                    
        except Exception as e:
            logger.error(f"Error updating mmr_data: {e}", exc_info=True)
            if conn:
                conn.rollback()
            return None


def delete_mmr_data(record_id: int) -> bool:
    """Delete MMR data by ID"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM mmr_data WHERE id = %s", (record_id,))
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
                
        except Exception as e:
            logger.error(f"Error deleting mmr_data: {e}", exc_info=True)
            if conn:
                conn.rollback()
            return False


def get_adjusted_mmr_for_vin(vin: str, miles: Optional[int] = None) -> Optional[float]:
    """
    Get mileage-adjusted MMR for a VIN from the mmr_data table.

    Adjustment logic (Manheim standard):
      adjusted_mmr = Base MMR + (avg_odometer - vehicle_miles) * MMR_PER_MILE
    Positive delta  → vehicle has fewer miles than avg → value goes up.
    Negative delta  → vehicle has more miles than avg  → value goes down.

    Returns adjusted MMR as float, or None if no mmr_data record found.
    """
    mmr_record = get_mmr_data_by_vin(vin)
    if not mmr_record:
        return None

    features = mmr_record.features or {}

    # Extract Base MMR — try several possible key formats
    base_mmr: Optional[float] = None
    for key in ("Base MMR", "base_mmr", "baseMmr", "mmr", "MMR"):
        val = features.get(key)
        if val is not None:
            try:
                base_mmr = float(val)
                break
            except (ValueError, TypeError):
                continue

    if not base_mmr:
        return None

    # Mileage adjustment (~$12 per 1,000 miles difference from avg)
    MMR_PER_MILE = 0.012
    adjustment = 0.0

    if miles is not None:
        avg_odometer: Optional[float] = None
        for key in ("Avg Odometer", "avg_odometer", "avgOdometer"):
            val = features.get(key)
            if val is not None:
                try:
                    avg_odometer = float(val)
                    break
                except (ValueError, TypeError):
                    continue

        if avg_odometer and avg_odometer > 0:
            mile_delta = miles - avg_odometer
            adjustment = -(mile_delta * MMR_PER_MILE)  # fewer miles → positive adj

    adjusted = round(base_mmr + adjustment, 2)
    logger.info(
        f"Adjusted MMR for VIN {vin}: base={base_mmr}, "
        f"miles={miles}, adj={adjustment:.2f}, result={adjusted}"
    )
    return adjusted


def delete_mmr_data_by_vin(vin: str) -> bool:
    """Delete MMR data by VIN"""
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
                
                cur.execute("DELETE FROM mmr_data WHERE vin = %s", (vin_normalized,))
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
                
        except Exception as e:
            logger.error(f"Error deleting mmr_data by VIN: {e}", exc_info=True)
            if conn:
                conn.rollback()
            return False
