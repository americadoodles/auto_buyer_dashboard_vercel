# CRM Dashboard API Routes
from fastapi import APIRouter, HTTPException, Depends
from ..schemas.crm import CRMStats, LeadConversionMetrics, SalesPerformanceMetrics
from ..schemas.user import UserOut
from ..core.auth import get_current_user, require_admin
from ..repositories.crm_dashboard import (
    get_crm_stats, get_lead_conversion_metrics, get_sales_performance_metrics,
    get_recent_activities, get_upcoming_tasks, get_deal_forecast
)
import logging

dashboard_router = APIRouter(prefix="/crm/dashboard", tags=["crm-dashboard"])

# ==============================================
# DASHBOARD ENDPOINTS
# ==============================================

@dashboard_router.get("/stats", response_model=CRMStats)
def get_dashboard_stats(
    current_user: UserOut = Depends(get_current_user)
):
    """Get comprehensive CRM statistics for dashboard"""
    try:
        return get_crm_stats()
    except Exception as e:
        logging.error(f"Error fetching CRM stats: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch CRM statistics")

@dashboard_router.get("/lead-metrics", response_model=LeadConversionMetrics)
def get_lead_conversion_metrics_endpoint(
    current_user: UserOut = Depends(require_admin)
):
    """Get lead conversion metrics (admin only)"""
    try:
        return get_lead_conversion_metrics()
    except Exception as e:
        logging.error(f"Error fetching lead conversion metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch lead conversion metrics")

@dashboard_router.get("/sales-metrics", response_model=SalesPerformanceMetrics)
def get_sales_performance_metrics_endpoint(
    current_user: UserOut = Depends(require_admin)
):
    """Get sales performance metrics (admin only)"""
    try:
        return get_sales_performance_metrics()
    except Exception as e:
        logging.error(f"Error fetching sales performance metrics: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch sales performance metrics")

@dashboard_router.get("/recent-activities")
def get_recent_activities_endpoint(
    current_user: UserOut = Depends(get_current_user)
):
    """Get recent activities across all CRM modules"""
    try:
        return get_recent_activities()
    except Exception as e:
        logging.error(f"Error fetching recent activities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch recent activities")

@dashboard_router.get("/upcoming-tasks")
def get_upcoming_tasks_endpoint(
    current_user: UserOut = Depends(get_current_user)
):
    """Get upcoming tasks for current user"""
    try:
        return get_upcoming_tasks(current_user.id)
    except Exception as e:
        logging.error(f"Error fetching upcoming tasks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch upcoming tasks")

@dashboard_router.get("/deal-forecast")
def get_deal_forecast_endpoint(
    current_user: UserOut = Depends(require_admin)
):
    """Get deal forecast data (admin only)"""
    try:
        return get_deal_forecast()
    except Exception as e:
        logging.error(f"Error fetching deal forecast: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch deal forecast")
