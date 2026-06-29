import logging
import json
from typing import Optional, List
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.condition_report import (
    ConditionReportIn,
    ConditionReportOut,
    ConditionReportUpdate,
    ConditionReportStatus
)

logger = logging.getLogger(__name__)


def ingest_condition_report(data: ConditionReportIn) -> ConditionReportStatus:
    """
    Create or update condition report data for a VIN (upsert operation).
    If a record with the same VIN exists, it will be updated; otherwise, a new record will be created.
    """
    if not DB_ENABLED:
        logger.warning("Database not enabled, skipping condition_report ingestion")
        return ConditionReportStatus(success=False, status_code=503, message="Database not enabled")
    
    vin = data.vin.strip().upper() if data.vin else None
    if not vin:
        logger.error("VIN is required for condition_report")
        return ConditionReportStatus(success=False, status_code=400, message="VIN is required")
    
    try:
        with get_db_connection() as conn:
            if not conn:
                logger.error("No database connection available")
                return ConditionReportStatus(success=False, status_code=503, message="Database connection unavailable")
            
            with conn.cursor() as cur:
                # Check if record exists
                cur.execute("SELECT id FROM condition_reports WHERE vin = %s", (vin,))
                existing = cur.fetchone()
                
                # Convert sections to JSON - model_dump() handles nested models including specialData.svgImage
                sections_json = json.dumps([section.model_dump(mode='json') for section in data.sections], ensure_ascii=False)
                key_value_pairs_json = json.dumps(data.keyValuePairs, ensure_ascii=False) if data.keyValuePairs else None
                vehicle_info_json = json.dumps(data.vehicleInfo, ensure_ascii=False) if data.vehicleInfo else None
                equipment_options_json = json.dumps(data.equipmentOptions, ensure_ascii=False) if data.equipmentOptions else None
                pricing_breakdown_json = json.dumps(data.pricingBreakdown, ensure_ascii=False) if data.pricingBreakdown else None
                
                if existing:
                    # Update existing record
                    record_id = existing[0]
                    cur.execute("""
                        UPDATE condition_reports
                        SET sections = %s::jsonb,
                            key_value_pairs = %s::jsonb,
                            vehicle_info = %s::jsonb,
                            equipment_options = %s::jsonb,
                            pricing_breakdown = %s::jsonb
                        WHERE vin = %s
                        RETURNING id
                    """, (sections_json, key_value_pairs_json, vehicle_info_json, equipment_options_json, pricing_breakdown_json, vin))
                    conn.commit()
                    logger.info(f"Updated condition_report for VIN: {vin}")
                    return ConditionReportStatus(
                        success=True,
                        status_code=200,
                        message="Condition report updated successfully",
                        record_id=record_id
                    )
                else:
                    # Insert new record
                    cur.execute("""
                        INSERT INTO condition_reports (vin, sections, key_value_pairs, vehicle_info, equipment_options, pricing_breakdown)
                        VALUES (%s, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb, %s::jsonb)
                        RETURNING id
                    """, (vin, sections_json, key_value_pairs_json, vehicle_info_json, equipment_options_json, pricing_breakdown_json))
                    record_id = cur.fetchone()[0]
                    conn.commit()
                    logger.info(f"Created condition_report for VIN: {vin}")
                    return ConditionReportStatus(
                        success=True,
                        status_code=201,
                        message="Condition report created successfully",
                        record_id=record_id
                    )
    except Exception as e:
        logger.error(f"Error ingesting condition_report: {e}", exc_info=True)
        return ConditionReportStatus(
            success=False,
            status_code=500,
            message=f"Error ingesting condition report: {str(e)}"
        )


def get_condition_report_by_vin(vin: str) -> Optional[ConditionReportOut]:
    """Get condition report data by VIN"""
    if not DB_ENABLED:
        logger.warning("Database not enabled")
        return None
    
    vin_normalized = vin.strip().upper() if vin else None
    if not vin_normalized:
        return None
    
    try:
        with get_db_connection() as conn:
            if not conn:
                return None
            
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, vin, sections, key_value_pairs, vehicle_info, equipment_options, pricing_breakdown, created_at, updated_at
                    FROM condition_reports
                    WHERE vin = %s
                    ORDER BY created_at DESC
                    LIMIT 1
                """, (vin_normalized,))
                
                row = cur.fetchone()
                if row:
                    return ConditionReportOut(
                        id=row[0],
                        vin=row[1],
                        sections=row[2] if isinstance(row[2], list) else json.loads(row[2]) if isinstance(row[2], str) else row[2],
                        key_value_pairs=row[3] if isinstance(row[3], dict) else json.loads(row[3]) if isinstance(row[3], str) else row[3],
                        vehicle_info=row[4] if isinstance(row[4], dict) else json.loads(row[4]) if isinstance(row[4], str) and row[4] else None,
                        equipment_options=row[5] if isinstance(row[5], list) else json.loads(row[5]) if isinstance(row[5], str) and row[5] else None,
                        pricing_breakdown=row[6] if isinstance(row[6], list) else json.loads(row[6]) if isinstance(row[6], str) and row[6] else None,
                        created_at=row[7],
                        updated_at=row[8]
                    )
                return None
    except Exception as e:
        logger.error(f"Error getting condition_report by VIN: {e}", exc_info=True)
        return None


def get_condition_report_by_id(record_id: int) -> Optional[ConditionReportOut]:
    """Get condition report data by record ID"""
    if not DB_ENABLED:
        logger.warning("Database not enabled")
        return None
    
    try:
        with get_db_connection() as conn:
            if not conn:
                return None
            
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, vin, sections, key_value_pairs, vehicle_info, equipment_options, pricing_breakdown, created_at, updated_at
                    FROM condition_reports
                    WHERE id = %s
                """, (record_id,))
                
                row = cur.fetchone()
                if row:
                    return ConditionReportOut(
                        id=row[0],
                        vin=row[1],
                        sections=row[2] if isinstance(row[2], list) else json.loads(row[2]) if isinstance(row[2], str) else row[2],
                        key_value_pairs=row[3] if isinstance(row[3], dict) else json.loads(row[3]) if isinstance(row[3], str) else row[3],
                        vehicle_info=row[4] if isinstance(row[4], dict) else json.loads(row[4]) if isinstance(row[4], str) and row[4] else None,
                        equipment_options=row[5] if isinstance(row[5], list) else json.loads(row[5]) if isinstance(row[5], str) and row[5] else None,
                        pricing_breakdown=row[6] if isinstance(row[6], list) else json.loads(row[6]) if isinstance(row[6], str) and row[6] else None,
                        created_at=row[7],
                        updated_at=row[8]
                    )
                return None
    except Exception as e:
        logger.error(f"Error getting condition_report by ID: {e}", exc_info=True)
        return None


def list_condition_reports(limit: Optional[int] = None, offset: Optional[int] = None) -> List[ConditionReportOut]:
    """List all condition reports with optional pagination"""
    if not DB_ENABLED:
        logger.warning("Database not enabled")
        return []
    
    try:
        with get_db_connection() as conn:
            if not conn:
                return []
            
            with conn.cursor() as cur:
                query = """
                    SELECT id, vin, sections, key_value_pairs, vehicle_info, equipment_options, pricing_breakdown, created_at, updated_at
                    FROM condition_reports
                    ORDER BY created_at DESC
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
                
                results = []
                for row in rows:
                    results.append(ConditionReportOut(
                        id=row[0],
                        vin=row[1],
                        sections=row[2] if isinstance(row[2], list) else json.loads(row[2]) if isinstance(row[2], str) else row[2],
                        key_value_pairs=row[3] if isinstance(row[3], dict) else json.loads(row[3]) if isinstance(row[3], str) else row[3],
                        vehicle_info=row[4] if isinstance(row[4], dict) else json.loads(row[4]) if isinstance(row[4], str) and row[4] else None,
                        equipment_options=row[5] if isinstance(row[5], list) else json.loads(row[5]) if isinstance(row[5], str) and row[5] else None,
                        pricing_breakdown=row[6] if isinstance(row[6], list) else json.loads(row[6]) if isinstance(row[6], str) and row[6] else None,
                        created_at=row[7],
                        updated_at=row[8]
                    ))
                
                return results
    except Exception as e:
        logger.error(f"Error listing condition_reports: {e}", exc_info=True)
        return []


def update_condition_report(record_id: int, data: ConditionReportUpdate) -> Optional[ConditionReportOut]:
    """Update condition report data by record ID"""
    if not DB_ENABLED:
        logger.warning("Database not enabled")
        return None
    
    try:
        with get_db_connection() as conn:
            if not conn:
                return None
            
            with conn.cursor() as cur:
                # Check if record exists
                cur.execute("SELECT id FROM condition_reports WHERE id = %s", (record_id,))
                if not cur.fetchone():
                    return None
                
                # Build update query dynamically based on provided fields
                update_fields = []
                params = []
                
                if data.sections is not None:
                    sections_json = json.dumps([section.model_dump(mode='json') for section in data.sections], ensure_ascii=False)
                    update_fields.append("sections = %s::jsonb")
                    params.append(sections_json)
                
                if data.keyValuePairs is not None:
                    key_value_pairs_json = json.dumps(data.keyValuePairs, ensure_ascii=False)
                    update_fields.append("key_value_pairs = %s::jsonb")
                    params.append(key_value_pairs_json)
                
                if data.vehicleInfo is not None:
                    vehicle_info_json = json.dumps(data.vehicleInfo, ensure_ascii=False)
                    update_fields.append("vehicle_info = %s::jsonb")
                    params.append(vehicle_info_json)
                
                if data.equipmentOptions is not None:
                    equipment_options_json = json.dumps(data.equipmentOptions, ensure_ascii=False)
                    update_fields.append("equipment_options = %s::jsonb")
                    params.append(equipment_options_json)
                
                if data.pricingBreakdown is not None:
                    pricing_breakdown_json = json.dumps(data.pricingBreakdown, ensure_ascii=False)
                    update_fields.append("pricing_breakdown = %s::jsonb")
                    params.append(pricing_breakdown_json)
                
                if not update_fields:
                    # No fields to update, return existing record
                    return get_condition_report_by_id(record_id)
                
                # Add record_id to params for WHERE clause
                params.append(record_id)
                
                query = f"""
                    UPDATE condition_reports
                    SET {', '.join(update_fields)}
                    WHERE id = %s
                    RETURNING id
                """
                cur.execute(query, tuple(params))
                conn.commit()
                
                return get_condition_report_by_id(record_id)
    except Exception as e:
        logger.error(f"Error updating condition_report: {e}", exc_info=True)
        return None


def delete_condition_report(record_id: int) -> bool:
    """Delete condition report data by record ID"""
    if not DB_ENABLED:
        logger.warning("Database not enabled")
        return False
    
    try:
        with get_db_connection() as conn:
            if not conn:
                return False
            
            with conn.cursor() as cur:
                cur.execute("DELETE FROM condition_reports WHERE id = %s", (record_id,))
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
    except Exception as e:
        logger.error(f"Error deleting condition_report: {e}", exc_info=True)
        return False


def delete_condition_report_by_vin(vin: str) -> bool:
    """Delete condition report data by VIN"""
    if not DB_ENABLED:
        logger.warning("Database not enabled")
        return False
    
    vin_normalized = vin.strip().upper() if vin else None
    if not vin_normalized:
        return False
    
    try:
        with get_db_connection() as conn:
            if not conn:
                return False
            
            with conn.cursor() as cur:
                cur.execute("DELETE FROM condition_reports WHERE vin = %s", (vin_normalized,))
                deleted = cur.rowcount > 0
                conn.commit()
                return deleted
    except Exception as e:
        logger.error(f"Error deleting condition_report by VIN: {e}", exc_info=True)
        return False
