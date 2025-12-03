from fastapi import APIRouter, Depends, Query
from typing import Optional
from ..schemas.activity_heatmap import ActivityHeatmapResponse
from ..repositories.activity_heatmap import get_activity_heatmap_data
from ..core.auth import get_current_user
from ..schemas.user import UserOut

activity_heatmap_router = APIRouter(prefix="/activity_heatmap", tags=["activity_heatmap"])


@activity_heatmap_router.get("", response_model=ActivityHeatmapResponse)
def get_activity_heatmap(
    buyer_id: Optional[str] = Query(None, description="Filter activities by buyer ID"),
    current_user: UserOut = Depends(get_current_user)
):
    """Get historical activity data for heatmap visualization.
    
    - Admin users: Can access all activities or filter by buyer_id
    - Buyer users: Can only access their own activities (buyer_id is automatically set to their user ID)
    """
    # For non-admin users, ensure they can only see their own data
    if current_user.role.lower() != 'admin':
        buyer_id = str(current_user.id)
    
    return get_activity_heatmap_data(buyer_id=buyer_id)
