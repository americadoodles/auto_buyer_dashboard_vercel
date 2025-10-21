from fastapi import APIRouter, Depends
from ..schemas.activity_heatmap import ActivityHeatmapResponse
from ..repositories.activity_heatmap import get_activity_heatmap_data
from ..core.auth import require_admin
from ..schemas.user import UserOut

activity_heatmap_router = APIRouter(prefix="/activity_heatmap", tags=["activity_heatmap"])


@activity_heatmap_router.get("", response_model=ActivityHeatmapResponse)
def get_activity_heatmap(_: UserOut = Depends(require_admin)):
    """Get historical activity data for heatmap visualization."""
    return get_activity_heatmap_data()
