from typing import Optional
from pydantic import BaseModel

class NotifyItem(BaseModel):
    vin: str
    channel: Optional[str] = "email"
    message: Optional[str] = None

class NotifyResponse(BaseModel):
    vin: str
    notified: bool
    channel: str
