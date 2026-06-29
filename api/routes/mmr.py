from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import List, Optional
from ..schemas.mmr import MMRDataIn, MMRDataOut, MMRDataUpdate, MMRDataStatus
from ..repositories.mmr_repository import (
    ingest_mmr_data,
    get_mmr_data_by_vin,
    get_mmr_data_by_id,
    list_mmr_data,
    update_mmr_data,
    delete_mmr_data,
    delete_mmr_data_by_vin
)
from ..core.auth import get_current_user
from ..schemas.user import UserOut

# Create router for MMR endpoints
mmr_router = APIRouter(prefix="/mmr", tags=["mmr"])


@mmr_router.post("", include_in_schema=False, response_model=MMRDataStatus)
@mmr_router.post("/", response_model=MMRDataStatus)
def ingest(
    data: MMRDataIn,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Create or update MMR data for a VIN (upsert operation).
    If a record with the same VIN exists, it will be updated; otherwise, a new record will be created.
    Accepts a single object with features, transactions, historicalAverage, projectedAverage, and estimatedRetail.
    """
    result = ingest_mmr_data(data)
    if not result.success:
        raise HTTPException(status_code=result.status_code, detail="Failed to ingest MMR data")
    return result


@mmr_router.get("/vin/{vin}/exists", response_model=dict)
async def check_vin_exists(
    vin: str = Path(..., description="Vehicle Identification Number"),
    current_user: UserOut = Depends(get_current_user)
):
    """Check if MMR data exists for a VIN"""
    result = get_mmr_data_by_vin(vin)
    return {"exists": result is not None}


@mmr_router.get("/vin/{vin}", response_model=MMRDataOut)
async def get_by_vin(
    vin: str = Path(..., description="Vehicle Identification Number"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get MMR data by VIN"""
    result = get_mmr_data_by_vin(vin)
    if result is None:
        raise HTTPException(status_code=404, detail=f"MMR data not found for VIN: {vin}")
    return result


@mmr_router.get("/{record_id}", response_model=MMRDataOut)
async def get_by_id(
    record_id: int = Path(..., description="MMR data record ID"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get MMR data by record ID"""
    result = get_mmr_data_by_id(record_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"MMR data not found with ID: {record_id}")
    return result


@mmr_router.get("", include_in_schema=False, response_model=List[MMRDataOut])
@mmr_router.get("/", response_model=List[MMRDataOut])
async def list_all(
    limit: Optional[int] = Query(None, ge=1, description="Maximum number of records to return"),
    offset: Optional[int] = Query(None, ge=0, description="Number of records to skip"),
    current_user: UserOut = Depends(get_current_user)
):
    """List all MMR data with optional pagination"""
    return list_mmr_data(limit=limit, offset=offset)


@mmr_router.put("/{record_id}", response_model=MMRDataOut)
async def update(
    record_id: int = Path(..., description="MMR data record ID"),
    data: MMRDataUpdate = ...,
    current_user: UserOut = Depends(get_current_user)
):
    """Update MMR data by record ID"""
    result = update_mmr_data(record_id, data)
    if result is None:
        raise HTTPException(status_code=404, detail=f"MMR data not found with ID: {record_id}")
    return result


@mmr_router.delete("/{record_id}", status_code=204)
async def delete(
    record_id: int = Path(..., description="MMR data record ID"),
    current_user: UserOut = Depends(get_current_user)
):
    """Delete MMR data by record ID"""
    success = delete_mmr_data(record_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"MMR data not found with ID: {record_id}")


@mmr_router.delete("/vin/{vin}", status_code=204)
async def delete_by_vin(
    vin: str = Path(..., description="Vehicle Identification Number"),
    current_user: UserOut = Depends(get_current_user)
):
    """Delete MMR data by VIN"""
    success = delete_mmr_data_by_vin(vin)
    if not success:
        raise HTTPException(status_code=404, detail=f"MMR data not found for VIN: {vin}")
