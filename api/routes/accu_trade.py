from fastapi import APIRouter, HTTPException, Depends, Query, Path
from typing import List, Optional
from ..schemas.accu_trade import AccuTradeDataIn, AccuTradeDataOut, AccuTradeDataUpdate, AccuTradeDataStatus
from ..repositories.accu_trade_repository import (
    ingest_accu_trade_data,
    get_accu_trade_data_by_vin,
    get_accu_trade_data_by_id,
    list_accu_trade_data,
    update_accu_trade_data,
    delete_accu_trade_data,
    delete_accu_trade_data_by_vin
)
from ..core.auth import get_current_user
from ..schemas.user import UserOut

# Create router for accu-trade endpoints
accu_trade_router = APIRouter(prefix="/accu-trade", tags=["accu-trade"])


@accu_trade_router.post("", include_in_schema=False, response_model=AccuTradeDataStatus)
@accu_trade_router.post("/", response_model=AccuTradeDataStatus)
def ingest(
    data: AccuTradeDataIn,
    current_user: UserOut = Depends(get_current_user)
):
    """
    Create or update AccuTrade data for a VIN (upsert operation).
    If a record with the same VIN exists, it will be updated; otherwise, a new record will be created.
    Accepts a single object with options, pricebar, localMarketListing, and localMarketStats.
    """
    result = ingest_accu_trade_data(data)
    print(result)
    if not result.success:
        raise HTTPException(status_code=500, detail="Failed to ingest AccuTrade data")
    return result


@accu_trade_router.get("/vin/{vin}/exists", response_model=dict)
async def check_vin_exists(
    vin: str = Path(..., description="Vehicle Identification Number"),
    current_user: UserOut = Depends(get_current_user)
):
    """Check if AccuTrade data exists for a VIN"""
    result = get_accu_trade_data_by_vin(vin)
    return {"exists": result is not None}


@accu_trade_router.get("/vin/{vin}/exists", response_model=dict)
async def check_vin_exists(
    vin: str = Path(..., description="Vehicle Identification Number"),
    current_user: UserOut = Depends(get_current_user)
):
    """Check if AccuTrade data exists for a VIN"""
    result = get_accu_trade_data_by_vin(vin)
    return {"exists": result is not None}


@accu_trade_router.get("/vin/{vin}", response_model=AccuTradeDataOut)
async def get_by_vin(
    vin: str = Path(..., description="Vehicle Identification Number"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get AccuTrade data by VIN"""
    result = get_accu_trade_data_by_vin(vin)
    if result is None:
        raise HTTPException(status_code=404, detail=f"AccuTrade data not found for VIN: {vin}")
    return result


@accu_trade_router.get("/{record_id}", response_model=AccuTradeDataOut)
async def get_by_id(
    record_id: int = Path(..., description="AccuTrade data record ID"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get AccuTrade data by record ID"""
    result = get_accu_trade_data_by_id(record_id)
    if result is None:
        raise HTTPException(status_code=404, detail=f"AccuTrade data not found with ID: {record_id}")
    return result


@accu_trade_router.get("", include_in_schema=False, response_model=List[AccuTradeDataOut])
@accu_trade_router.get("/", response_model=List[AccuTradeDataOut])
async def list_all(
    limit: Optional[int] = Query(None, ge=1, description="Maximum number of records to return"),
    offset: Optional[int] = Query(None, ge=0, description="Number of records to skip"),
    current_user: UserOut = Depends(get_current_user)
):
    """List all AccuTrade data with optional pagination"""
    return list_accu_trade_data(limit=limit, offset=offset)


@accu_trade_router.put("/{record_id}", response_model=AccuTradeDataOut)
async def update(
    record_id: int = Path(..., description="AccuTrade data record ID"),
    data: AccuTradeDataUpdate = ...,
    current_user: UserOut = Depends(get_current_user)
):
    """Update AccuTrade data by record ID"""
    result = update_accu_trade_data(record_id, data)
    if result is None:
        raise HTTPException(status_code=404, detail=f"AccuTrade data not found with ID: {record_id}")
    return result


@accu_trade_router.delete("/{record_id}", status_code=204)
async def delete(
    record_id: int = Path(..., description="AccuTrade data record ID"),
    current_user: UserOut = Depends(get_current_user)
):
    """Delete AccuTrade data by record ID"""
    success = delete_accu_trade_data(record_id)
    if not success:
        raise HTTPException(status_code=404, detail=f"AccuTrade data not found with ID: {record_id}")


@accu_trade_router.delete("/vin/{vin}", status_code=204)
async def delete_by_vin(
    vin: str = Path(..., description="Vehicle Identification Number"),
    current_user: UserOut = Depends(get_current_user)
):
    """Delete AccuTrade data by VIN"""
    success = delete_accu_trade_data_by_vin(vin)
    if not success:
        raise HTTPException(status_code=404, detail=f"AccuTrade data not found for VIN: {vin}")
