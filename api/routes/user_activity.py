from fastapi import APIRouter, Depends
from ..schemas.user_activity import UserActivityResponse
from ..repositories.user_activity import get_user_activity_stats
from ..core.auth import require_admin
from ..schemas.user import UserOut

user_activity_router = APIRouter(prefix="/user-activity", tags=["user-activity"])


@user_activity_router.get("/", response_model=UserActivityResponse)
def get_user_activity(_: UserOut = Depends(require_admin)):
    """Get comprehensive user activity statistics for admin dashboard."""
    return get_user_activity_stats()
