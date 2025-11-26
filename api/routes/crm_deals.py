# CRM Deal Management API Routes
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from uuid import UUID
from ..schemas.crm import (
    DealCreate, DealUpdate, DealOut, DealActivityCreate, DealActivityOut,
    DealStageCreate, DealStageOut, DealCategoryCreate, DealCategoryOut,
    DealPipeline, SalesPerformanceMetrics
)
from ..schemas.user import UserOut
from ..core.auth import get_current_user, require_admin
from ..repositories.crm_deals import (
    create_deal, get_deal, update_deal, delete_deal, list_deals,
    create_deal_activity, get_deal_activities,
    create_deal_stage, get_deal_stages, update_deal_stage, delete_deal_stage,
    create_deal_category, get_deal_categories, update_deal_category, delete_deal_category,
    get_deal_pipeline, get_sales_performance_metrics
)
import logging

deal_router = APIRouter(prefix="/crm/deals", tags=["crm-deals"])

# ==============================================
# DEAL MANAGEMENT ENDPOINTS
# ==============================================

@deal_router.post("", response_model=DealOut, include_in_schema=False)  # /api/crm/deals
@deal_router.post("/", response_model=DealOut)  # /api/crm/deals/
def create_new_deal(
    deal: DealCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new deal"""
    try:
        return create_deal(deal, current_user.id)
    except Exception as e:
        logging.error(f"Error creating deal: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create deal")

@deal_router.get("", response_model=List[DealOut], include_in_schema=False)  # /api/crm/deals
@deal_router.get("/", response_model=List[DealOut])  # /api/crm/deals/
def get_all_deals(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    stage_id: Optional[int] = Query(None),
    category_id: Optional[int] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    contact_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    is_won: Optional[bool] = Query(None),
    is_lost: Optional[bool] = Query(None),
    current_user: UserOut = Depends(get_current_user)
):
    """Get all deals with optional filtering"""
    try:
        return list_deals(skip=skip, limit=limit, stage_id=stage_id,
                         category_id=category_id, assigned_to=assigned_to,
                         contact_id=contact_id, search=search,
                         is_won=is_won, is_lost=is_lost)
    except Exception as e:
        logging.error(f"Error fetching deals: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deals")

@deal_router.get("/pipeline", response_model=List[DealPipeline])
def get_deal_pipeline_view(
    current_user: UserOut = Depends(get_current_user)
):
    """Get deal pipeline view for dashboard"""
    try:
        return get_deal_pipeline()
    except Exception as e:
        logging.error(f"Error fetching deal pipeline: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal pipeline")

@deal_router.get("/metrics", response_model=SalesPerformanceMetrics)
def get_sales_metrics(
    current_user: UserOut = Depends(require_admin)
):
    """Get sales performance metrics (admin only)"""
    try:
        return get_sales_performance_metrics()
    except Exception as e:
        logging.error(f"Error fetching sales metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch sales metrics")

# ==============================================
# DEAL STAGE MANAGEMENT ENDPOINTS (must come before /{deal_id})
# ==============================================

@deal_router.post("/stages", response_model=DealStageOut)
def create_deal_stage_endpoint(
    stage: DealStageCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Create a new deal stage (admin only)"""
    try:
        return create_deal_stage(stage)
    except Exception as e:
        logging.error(f"Error creating deal stage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create deal stage")

@deal_router.get("/stages", response_model=List[DealStageOut])
def get_deal_stages_list(
    current_user: UserOut = Depends(get_current_user)
):
    """Get all deal stages"""
    try:
        return get_deal_stages()
    except Exception as e:
        logging.error(f"Error fetching deal stages: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal stages")

@deal_router.put("/stages/{stage_id}", response_model=DealStageOut)
def update_deal_stage_endpoint(
    stage_id: int,
    stage: DealStageCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Update a deal stage (admin only)"""
    try:
        updated_stage = update_deal_stage(stage_id, stage)
        if not updated_stage:
            raise HTTPException(status_code=404, detail="Deal stage not found")
        return updated_stage
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating deal stage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update deal stage")

@deal_router.delete("/stages/{stage_id}")
def delete_deal_stage_endpoint(
    stage_id: int,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a deal stage (admin only)"""
    try:
        success = delete_deal_stage(stage_id)
        if not success:
            raise HTTPException(status_code=404, detail="Deal stage not found")
        return {"message": "Deal stage deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting deal stage: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete deal stage")

# ==============================================
# DEAL CATEGORY MANAGEMENT ENDPOINTS (must come before /{deal_id})
# ==============================================

@deal_router.post("/categories", response_model=DealCategoryOut)
def create_deal_category_endpoint(
    category: DealCategoryCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Create a new deal category (admin only)"""
    try:
        return create_deal_category(category)
    except Exception as e:
        logging.error(f"Error creating deal category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create deal category")

@deal_router.get("/categories", response_model=List[DealCategoryOut])
def get_deal_categories_list(
    current_user: UserOut = Depends(get_current_user)
):
    """Get all deal categories"""
    try:
        return get_deal_categories()
    except Exception as e:
        logging.error(f"Error fetching deal categories: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal categories")

@deal_router.put("/categories/{category_id}", response_model=DealCategoryOut)
def update_deal_category_endpoint(
    category_id: int,
    category: DealCategoryCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Update a deal category (admin only)"""
    try:
        updated_category = update_deal_category(category_id, category)
        if not updated_category:
            raise HTTPException(status_code=404, detail="Deal category not found")
        return updated_category
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating deal category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update deal category")

@deal_router.delete("/categories/{category_id}")
def delete_deal_category_endpoint(
    category_id: int,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a deal category (admin only)"""
    try:
        success = delete_deal_category(category_id)
        if not success:
            raise HTTPException(status_code=404, detail="Deal category not found")
        return {"message": "Deal category deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting deal category: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete deal category")

@deal_router.get("/{deal_id}", response_model=DealOut)
def get_deal_by_id(
    deal_id: UUID,
    current_user: UserOut = Depends(get_current_user)
):
    """Get a specific deal by ID"""
    try:
        deal = get_deal(deal_id)
        if not deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        return deal
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching deal {deal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal")

@deal_router.put("/{deal_id}", response_model=DealOut)
def update_deal_by_id(
    deal_id: UUID,
    deal_update: DealUpdate,
    current_user: UserOut = Depends(get_current_user)
):
    """Update a specific deal"""
    try:
        updated_deal = update_deal(deal_id, deal_update)
        if not updated_deal:
            raise HTTPException(status_code=404, detail="Deal not found")
        return updated_deal
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating deal {deal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update deal")

@deal_router.delete("/{deal_id}")
def delete_deal_by_id(
    deal_id: UUID,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a specific deal (admin only)"""
    try:
        success = delete_deal(deal_id)
        if not success:
            raise HTTPException(status_code=404, detail="Deal not found")
        return {"message": "Deal deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting deal {deal_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete deal")

# ==============================================
# DEAL ACTIVITY ENDPOINTS
# ==============================================

@deal_router.post("/{deal_id}/activities", response_model=DealActivityOut)
def create_deal_activity(
    deal_id: UUID,
    activity: DealActivityCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new activity for a deal"""
    try:
        activity.deal_id = deal_id
        return create_deal_activity(activity, current_user.id)
    except Exception as e:
        logging.error(f"Error creating deal activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create deal activity")

@deal_router.get("/{deal_id}/activities", response_model=List[DealActivityOut])
def get_deal_activities_list(
    deal_id: UUID,
    current_user: UserOut = Depends(get_current_user)
):
    """Get all activities for a specific deal"""
    try:
        return get_deal_activities(deal_id)
    except Exception as e:
        logging.error(f"Error fetching deal activities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal activities")

