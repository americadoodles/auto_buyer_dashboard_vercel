from typing import Optional, List
from pydantic import BaseModel
from datetime import datetime
from uuid import UUID


class UserActivityStats(BaseModel):
    user_id: UUID
    username: str
    email: str
    role: str
    is_confirmed: bool
    last_login: Optional[datetime] = None
    total_listings: int = 0
    today_listings: int = 0
    last_activity: Optional[datetime] = None


class UserActivityResponse(BaseModel):
    users: List[UserActivityStats]
    total_users: int
    active_today: int
    total_listings_today: int
