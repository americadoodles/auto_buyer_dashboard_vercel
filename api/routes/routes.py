import logging
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from datetime import datetime
from ..schemas.listing import ListingIn, ListingOut
from ..schemas.notify import NotifyItem, NotifyResponse
from ..schemas.kpi import KpiResponse, KpiMetrics
from ..schemas.chart import ChartDistributionResponse, DistributionItem, ChartTimeSeriesResponse, TimeSeriesDataPoint
from ..repositories.repositories import ingest_listings, list_listings, list_listings_by_buyer, get_buyer_stats
from ..repositories.kpi_repository import get_trends_data, get_kpi_metrics
from ..repositories.chart_repository import get_sourcing_activities_per_agent, get_car_categories_performance, get_states_regions_performance, get_lead_to_purchase_funnel, get_lead_source_performance
from ..core.auth import get_current_user
from ..schemas.user import UserOut
from ..services.services import notify as do_notify
from ..services.fb_marketplace import fb_payload_to_listing_in
from .activity_heatmap import activity_heatmap_router

# Create routers for each endpoint group
ingest_router = APIRouter(prefix="/ingest", tags=["ingest"])
listings_router = APIRouter(prefix="/listings", tags=["listings"])
notify_router = APIRouter(prefix="/notify", tags=["notify"])
trends_router = APIRouter(prefix="/trends", tags=["trends"])
kpi_router = APIRouter(prefix="/kpi", tags=["kpi"])
chart_router = APIRouter(prefix="/chart", tags=["chart"])

# Ingest routes
@ingest_router.post("", include_in_schema=False, response_model=List[ListingOut])  # /api/ingest
@ingest_router.post("/", response_model=List[ListingOut])  # /api/ingest/
def ingest(listings: List[ListingIn], current_user: UserOut = Depends(get_current_user)):
    return ingest_listings(listings, buyer_id=str(current_user.id))


@ingest_router.post("/facebook", response_model=List[ListingOut])  # /api/ingest/facebook
def ingest_facebook(payloads: List[dict], current_user: UserOut = Depends(get_current_user)):
    """Accept raw FB Marketplace payloads and route them through the standard pipeline."""
    print(f"\n>>> [ingest/facebook] received {len(payloads)} FB payload(s) "
          f"from buyer_id={current_user.id}", flush=True)

    listings: List[ListingIn] = []
    for i, raw in enumerate(payloads, start=1):
        mapped = fb_payload_to_listing_in(raw)
        print(
            f">>> [ingest/facebook] [{i}/{len(payloads)}] "
            f"fb_listing_id={mapped.get('fbListingId')} | "
            f"{mapped.get('year') or '?'} {mapped.get('make') or '?'} "
            f"{mapped.get('model') or '?'} {mapped.get('trim') or ''} | "
            f"price={mapped.get('price')} miles={mapped.get('miles')} | "
            f"seller={mapped.get('sellerName') or '(none)'} "
            f"phone={mapped.get('phoneNumber') or '(none)'} | "
            f"location={mapped.get('location') or '(none)'} | "
            f"source={mapped.get('source') or '(none)'}",
            flush=True,
        )
        try:
            listings.append(ListingIn(**mapped))
        except Exception as e:
            print(f">>> [ingest/facebook] [{i}/{len(payloads)}] VALIDATION FAILED: {e}", flush=True)
            raise

    print(f">>> [ingest/facebook] calling ingest_listings with {len(listings)} "
          f"validated ListingIn objects (skip_ai_extraction=True)…", flush=True)
    result = ingest_listings(listings, buyer_id=str(current_user.id), skip_ai_extraction=True)
    print(f">>> [ingest/facebook] done — ingest_listings returned {len(result)} "
          f"ListingOut(s) (out of {len(payloads)} received)\n", flush=True)
    return result

# Listings routes
@listings_router.get("", include_in_schema=False, response_model=List[ListingOut])  # /api/listings
@listings_router.get("/", response_model=List[ListingOut])  # /api/listings/
def list_(
    limit: Optional[int] = Query(None, ge=1, description="Number of records to fetch (default: all)"),
    start_date: Optional[datetime] = Query(None, description="Start date for filtering (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering (ISO format)")
):
    return list_listings(limit=limit, start_date=start_date, end_date=end_date)

@listings_router.get("/buyer/{buyer_id}", response_model=List[ListingOut])
def list_by_buyer(
    buyer_id: str,
    start_date: Optional[datetime] = Query(None, description="Start date for filtering (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering (ISO format)"),
    limit: Optional[int] = Query(None, ge=1, description="Number of records to fetch (default: all)")
):
    """Get listings for a specific buyer with optional date filtering"""
    return list_listings_by_buyer(buyer_id, start_date, end_date, limit)

@listings_router.get("/buyer/{buyer_id}/stats")
def get_buyer_performance_stats(
    buyer_id: str,
    start_date: Optional[datetime] = Query(None, description="Start date for filtering (ISO format)"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering (ISO format)")
):
    """Get performance statistics for a specific buyer"""
    return get_buyer_stats(buyer_id, start_date, end_date)

# Notify routes
@notify_router.post("", include_in_schema=False, response_model=List[NotifyResponse])  # /api/notify
@notify_router.post("/", response_model=List[NotifyResponse])  # /api/notify/
def notify(items: List[NotifyItem]):
    return [NotifyResponse(**do_notify(it)) for it in items]

# Trends routes
@trends_router.get("", include_in_schema=False)  # /api/trends
@trends_router.get("/", response_model=dict)  # /api/trends/
def get_trends(days_back: int = Query(30, ge=7, le=90, description="Number of days to look back for trend calculation")):
    """Get KPI trends comparing current period vs previous period"""
    return get_trends_data(days_back)

# KPI routes
@kpi_router.get("", include_in_schema=False, response_model=KpiResponse)  # /api/kpi
@kpi_router.get("/", response_model=KpiResponse)  # /api/kpi/
def get_kpi_metrics_endpoint(current_user: UserOut = Depends(get_current_user)):
    """Get comprehensive KPI metrics for the dashboard"""
    try:
        metrics_data = get_kpi_metrics()
        metrics = KpiMetrics(**metrics_data)
        return KpiResponse(metrics=metrics, success=True)
    except Exception as e:
        return KpiResponse(
            metrics=KpiMetrics(
                average_profit_per_unit=0.0,
                lead_to_purchase_time=0.0,
                aged_inventory=0,
                total_listings=0,
                active_buyers=0,
                conversion_rate=0.0,
                average_price=0.0,
                total_value=0.0,
                scoring_rate=0.0,
                average_score=0.0
            ),
            success=False,
            message=f"Error calculating KPI metrics: {str(e)}"
        )

# Chart distribution routes
@chart_router.get("/sourcing-activities", response_model=ChartDistributionResponse)
def get_sourcing_activities_chart(current_user: UserOut = Depends(get_current_user)):
    """Get sourcing activities per agent for chart"""
    try:
        data = get_sourcing_activities_per_agent()
        distribution_items = [DistributionItem(name=item["name"], value=item["value"]) for item in data]
        return ChartDistributionResponse(data=distribution_items, success=True)
    except Exception as e:
        return ChartDistributionResponse(
            data=[],
            success=False,
            message=f"Error fetching sourcing activities: {str(e)}"
        )

@chart_router.get("/car-categories", response_model=ChartDistributionResponse)
def get_car_categories_chart(current_user: UserOut = Depends(get_current_user)):
    """Get car categories performance for chart"""
    try:
        data = get_car_categories_performance()
        distribution_items = [DistributionItem(name=item["name"], value=item["value"]) for item in data]
        return ChartDistributionResponse(data=distribution_items, success=True)
    except Exception as e:
        return ChartDistributionResponse(
            data=[],
            success=False,
            message=f"Error fetching car categories: {str(e)}"
        )

@chart_router.get("/states-regions", response_model=ChartDistributionResponse)
def get_states_regions_chart(current_user: UserOut = Depends(get_current_user)):
    """Get states/regions performance for chart"""
    try:
        data = get_states_regions_performance()
        distribution_items = [DistributionItem(name=item["name"], value=item["value"]) for item in data]
        return ChartDistributionResponse(data=distribution_items, success=True)
    except Exception as e:
        return ChartDistributionResponse(
            data=[],
            success=False,
            message=f"Error fetching states/regions: {str(e)}"
        )

@chart_router.get("/lead-to-purchase-funnel", response_model=ChartTimeSeriesResponse)
def get_lead_to_purchase_funnel_chart(
    start_date: Optional[str] = Query(None, description="Start date in ISO format (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date in ISO format (YYYY-MM-DD)"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get lead to purchase funnel data (conversions over time)"""
    try:
        # Parse date strings (YYYY-MM-DD) to datetime objects
        start = None
        end = None
        if start_date:
            try:
                start = datetime.fromisoformat(start_date)
            except ValueError:
                # If it's just a date (YYYY-MM-DD), add time component
                start = datetime.fromisoformat(f"{start_date}T00:00:00")
        if end_date:
            try:
                end = datetime.fromisoformat(end_date)
            except ValueError:
                # If it's just a date (YYYY-MM-DD), add time component and set to end of day
                end = datetime.fromisoformat(f"{end_date}T23:59:59")
        data = get_lead_to_purchase_funnel(start_date=start, end_date=end)
        time_series_items = [TimeSeriesDataPoint(date=item["date"], value=item["value"]) for item in data]
        return ChartTimeSeriesResponse(data=time_series_items, success=True)
    except Exception as e:
        return ChartTimeSeriesResponse(
            data=[],
            success=False,
            message=f"Error fetching lead to purchase funnel: {str(e)}"
        )

@chart_router.get("/lead-source-performance", response_model=ChartDistributionResponse)
def get_lead_source_performance_chart(current_user: UserOut = Depends(get_current_user)):
    """Get lead source performance for chart"""
    try:
        data = get_lead_source_performance()
        distribution_items = [DistributionItem(name=item["name"], value=item["value"]) for item in data]
        return ChartDistributionResponse(data=distribution_items, success=True)
    except Exception as e:
        return ChartDistributionResponse(
            data=[],
            success=False,
            message=f"Error fetching lead source performance: {str(e)}"
        )
