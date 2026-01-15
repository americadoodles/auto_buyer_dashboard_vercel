from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import List, Optional
from ..schemas.condition_report import (
    ConditionReportIn,
    ConditionReportOut,
    ConditionReportUpdate,
    ConditionReportStatus
)
from ..repositories.condition_report_repository import (
    ingest_condition_report,
    get_condition_report_by_vin,
    get_condition_report_by_id,
    list_condition_reports,
    update_condition_report,
    delete_condition_report,
    delete_condition_report_by_vin
)
from ..core.auth import get_current_user
from ..schemas.user import UserOut

# Create router for condition report endpoints
condition_report_router = APIRouter(prefix="/accu-trade-report", tags=["condition-report"])


@condition_report_router.post("", include_in_schema=False, response_model=ConditionReportStatus)
@condition_report_router.post("/", response_model=ConditionReportStatus)
def ingest(
    data: ConditionReportIn,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Create or update condition report data for a VIN (upsert operation).
    If a record with the same VIN exists, it will be updated; otherwise, a new record will be created.
    Accepts condition report data with sections and key-value pairs.
    """
    result = ingest_condition_report(data)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail=result.message)
    return result


@condition_report_router.get("/vin/{vin}/exists", response_model=dict)
async def check_vin_exists(
    vin: str = Path(..., description="Vehicle Identification Number"),
    current_user: UserOut = Depends(get_current_user)
):
    """Check if condition report data exists for a VIN"""
    result = get_condition_report_by_vin(vin)
    return {"exists": result is not None}


@condition_report_router.get("/vin/{vin}", response_model=ConditionReportOut)
async def get_by_vin(
    vin: str = Path(..., description="Vehicle Identification Number"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get condition report data by VIN"""
    result = get_condition_report_by_vin(vin)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Condition report not found for VIN: {vin}")
    return result


@condition_report_router.get("/{record_id}", response_model=ConditionReportOut)
async def get_by_id(
    record_id: int = Path(..., description="Condition report record ID"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get condition report data by record ID"""
    result = get_condition_report_by_id(record_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Condition report not found with ID: {record_id}")
    return result


@condition_report_router.get("", include_in_schema=False, response_model=List[ConditionReportOut])
@condition_report_router.get("/", response_model=List[ConditionReportOut])
async def list_all(
    limit: Optional[int] = Query(None, ge=1, description="Maximum number of records to return"),
    offset: Optional[int] = Query(None, ge=0, description="Number of records to skip"),
    current_user: UserOut = Depends(get_current_user)
):
    """List all condition reports with optional pagination"""
    return list_condition_reports(limit=limit, offset=offset)


@condition_report_router.put("/{record_id}", response_model=ConditionReportOut)
async def update(
    record_id: int = Path(..., description="Condition report record ID"),
    data: ConditionReportUpdate = ...,
    current_user: UserOut = Depends(get_current_user)
):
    """Update condition report data by record ID"""
    result = update_condition_report(record_id, data)
    if result is None:
        raise HTTPException(status_code=404, detail=f"Condition report not found with ID: {record_id}")
    return result


@condition_report_router.delete("/{record_id}", status_code=204)
async def delete(
    record_id: int = Path(..., description="Condition report record ID"),
    current_user: UserOut = Depends(get_current_user)
):
    """Delete condition report data by record ID"""
    success = delete_condition_report(record_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"Condition report not found with ID: {record_id}")


@condition_report_router.delete("/vin/{vin}", status_code=204)
async def delete_by_vin(
    vin: str = Path(..., description="Vehicle Identification Number"),
    current_user: UserOut = Depends(get_current_user)
):
    """Delete condition report data by VIN"""
    success = delete_condition_report_by_vin(vin)
    if not success:
        raise HTTPException(status_code=404, detail=f"Condition report not found for VIN: {vin}")
