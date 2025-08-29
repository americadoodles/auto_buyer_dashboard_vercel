from typing import Optional
from pydantic import BaseModel

class NotifyItem(BaseModel):
    vehicle_key: str
    vin: str
    channel: Optional[str] = "email"
    message: Optional[str] = None

class NotifyResponse(BaseModel):
    vehicle_key: str
    vin: str
    notified: bool
    channel: str
