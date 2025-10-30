# CRM Lead Management API Routes
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from uuid import UUID
from ..schemas.crm import (
    LeadCreate, LeadUpdate, LeadOut, LeadActivityCreate, LeadActivityOut,
    LeadSourceCreate, LeadSourceOut, LeadStatusCreate, LeadStatusOut,
    LeadSummary, LeadConversionMetrics
)
from ..schemas.user import UserOut
from ..core.auth import get_current_user, require_admin
from ..repositories.crm_leads import (
    create_lead, get_lead, update_lead, delete_lead, list_leads,
    create_lead_activity, get_lead_activities,
    create_lead_source, get_lead_sources, update_lead_source, delete_lead_source,
    create_lead_status, get_lead_statuses, update_lead_status, delete_lead_status,
    get_lead_summary, get_lead_conversion_metrics
)
import logging

lead_router = APIRouter(prefix="/crm/leads", tags=["crm-leads"])

# ==============================================
# LEAD MANAGEMENT ENDPOINTS
# ==============================================

@lead_router.post("/", response_model=LeadOut)
def create_new_lead(
    lead: LeadCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new lead"""
    try:
        return create_lead(lead, current_user.id)
    except Exception as e:
        logging.error(f"Error creating lead: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create lead")

@lead_router.get("", include_in_schema=False, response_model=List[LeadOut])  # /api/crm/leads
@lead_router.get("/", response_model=List[LeadOut])  # /api/crm/leads/
def get_all_leads(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    status_id: Optional[int] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    current_user: UserOut = Depends(get_current_user)
):
    """Get all leads with optional filtering"""
    try:
        return list_leads(skip=skip, limit=limit, status_id=status_id, 
                         assigned_to=assigned_to, search=search)
    except Exception as e:
        logging.error(f"Error fetching leads: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch leads")

@lead_router.get("/summary", response_model=List[LeadSummary])
def get_lead_summary_list(
    current_user: UserOut = Depends(get_current_user)
):
    """Get lead summary for dashboard"""
    try:
        return get_lead_summary()
    except Exception as e:
        logging.error(f"Error fetching lead summary: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch lead summary")

@lead_router.get("/metrics", response_model=LeadConversionMetrics)
def get_lead_metrics(
    current_user: UserOut = Depends(require_admin)
):
    """Get lead conversion metrics (admin only)"""
    try:
        return get_lead_conversion_metrics()
    except Exception as e:
        logging.error(f"Error fetching lead metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch lead metrics")

# ==============================================
# LEAD SOURCE MANAGEMENT ENDPOINTS
# ==============================================

@lead_router.post("/sources", response_model=LeadSourceOut)
def create_lead_source_endpoint(
    source: LeadSourceCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Create a new lead source (admin only)"""
    try:
        return create_lead_source(source)
    except Exception as e:
        logging.error(f"Error creating lead source: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create lead source")

@lead_router.get("/sources", response_model=List[LeadSourceOut])
def get_lead_sources_list(
    current_user: UserOut = Depends(get_current_user)
):
    """Get all lead sources"""
    try:
        return get_lead_sources()
    except Exception as e:
        logging.error(f"Error fetching lead sources: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch lead sources")

@lead_router.put("/sources/{source_id}", response_model=LeadSourceOut)
def update_lead_source_endpoint(
    source_id: int,
    source: LeadSourceCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Update a lead source (admin only)"""
    try:
        updated_source = update_lead_source(source_id, source)
        if not updated_source:
            raise HTTPException(status_code=404, detail="Lead source not found")
        return updated_source
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating lead source: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update lead source")

@lead_router.delete("/sources/{source_id}")
def delete_lead_source_endpoint(
    source_id: int,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a lead source (admin only)"""
    try:
        success = delete_lead_source(source_id)
        if not success:
            raise HTTPException(status_code=404, detail="Lead source not found")
        return {"message": "Lead source deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting lead source: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete lead source")

# ==============================================
# LEAD STATUS MANAGEMENT ENDPOINTS
# ==============================================

@lead_router.post("/statuses", response_model=LeadStatusOut)
def create_lead_status_endpoint(
    status: LeadStatusCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Create a new lead status (admin only)"""
    try:
        return create_lead_status(status)
    except Exception as e:
        logging.error(f"Error creating lead status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create lead status")

@lead_router.get("/statuses", response_model=List[LeadStatusOut])
def get_lead_statuses_list(
    current_user: UserOut = Depends(get_current_user)
):
    """Get all lead statuses"""
    try:
        return get_lead_statuses()
    except Exception as e:
        logging.error(f"Error fetching lead statuses: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch lead statuses")

@lead_router.put("/statuses/{status_id}", response_model=LeadStatusOut)
def update_lead_status_endpoint(
    status_id: int,
    status: LeadStatusCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Update a lead status (admin only)"""
    try:
        updated_status = update_lead_status(status_id, status)
        if not updated_status:
            raise HTTPException(status_code=404, detail="Lead status not found")
        return updated_status
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating lead status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update lead status")

@lead_router.delete("/statuses/{status_id}")
def delete_lead_status_endpoint(
    status_id: int,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a lead status (admin only)"""
    try:
        success = delete_lead_status(status_id)
        if not success:
            raise HTTPException(status_code=404, detail="Lead status not found")
        return {"message": "Lead status deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting lead status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete lead status")

@lead_router.get("/{lead_id}", response_model=LeadOut)
def get_lead_by_id(
    lead_id: UUID,
    current_user: UserOut = Depends(get_current_user)
):
    """Get a specific lead by ID"""
    try:
        lead = get_lead(lead_id)
        if not lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        return lead
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching lead {lead_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch lead")

@lead_router.put("/{lead_id}", response_model=LeadOut)
def update_lead_by_id(
    lead_id: UUID,
    lead_update: LeadUpdate,
    current_user: UserOut = Depends(get_current_user)
):
    """Update a specific lead"""
    try:
        updated_lead = update_lead(lead_id, lead_update)
        if not updated_lead:
            raise HTTPException(status_code=404, detail="Lead not found")
        return updated_lead
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating lead {lead_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update lead")

@lead_router.delete("/{lead_id}")
def delete_lead_by_id(
    lead_id: UUID,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a specific lead (admin only)"""
    try:
        success = delete_lead(lead_id)
        if not success:
            raise HTTPException(status_code=404, detail="Lead not found")
        return {"message": "Lead deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting lead {lead_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete lead")

# ==============================================
# LEAD ACTIVITY ENDPOINTS
# ==============================================

@lead_router.post("/{lead_id}/activities", response_model=LeadActivityOut)
def create_lead_activity(
    lead_id: UUID,
    activity: LeadActivityCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new activity for a lead"""
    try:
        activity.lead_id = lead_id
        return create_lead_activity(activity, current_user.id)
    except Exception as e:
        logging.error(f"Error creating lead activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create lead activity")

@lead_router.get("/{lead_id}/activities", response_model=List[LeadActivityOut])
def get_lead_activities_list(
    lead_id: UUID,
    current_user: UserOut = Depends(get_current_user)
):
    """Get all activities for a specific lead"""
    try:
        return get_lead_activities(lead_id)
    except Exception as e:
        logging.error(f"Error fetching lead activities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch lead activities")
