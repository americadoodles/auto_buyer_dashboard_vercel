from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel
from enum import Enum
from uuid import UUID

class ExportType(str, Enum):
    ALL = "all"
    DAILY = "daily"
    RANGE = "range"

class ExportRequest(BaseModel):
    export_type: ExportType
    start_date: Optional[date] = None
    end_date: Optional[date] = None
    format: str = "csv"
    buyer_id: Optional[UUID] = None  # For exporting specific buyer's data

class ExportResponse(BaseModel):
    message: str
    download_url: Optional[str] = None
    filename: str
    record_count: int
