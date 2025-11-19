"""
Date and time utility functions.
"""
from datetime import datetime, date, time, timezone
from typing import Optional


def get_today_range() -> tuple[datetime, datetime]:
    """
    Get start and end of today in UTC.
    
    Returns:
        Tuple of (start_of_today, end_of_today) in UTC
    """
    today = date.today()
    start = datetime.combine(today, time.min).replace(tzinfo=timezone.utc)
    end = datetime.combine(today, time.max).replace(tzinfo=timezone.utc)
    return start, end


def parse_date_range(
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None
) -> tuple[Optional[datetime], Optional[datetime]]:
    """
    Parse and normalize date range parameters.
    
    Args:
        start_date: Start date (can be datetime or date)
        end_date: End date (can be datetime or date)
        
    Returns:
        Tuple of (normalized_start_date, normalized_end_date)
    """
    normalized_start = None
    normalized_end = None
    
    if start_date:
        if isinstance(start_date, date) and not isinstance(start_date, datetime):
            normalized_start = datetime.combine(start_date, time.min).replace(tzinfo=timezone.utc)
        elif isinstance(start_date, datetime):
            normalized_start = start_date.replace(tzinfo=timezone.utc) if start_date.tzinfo is None else start_date
    
    if end_date:
        if isinstance(end_date, date) and not isinstance(end_date, datetime):
            normalized_end = datetime.combine(end_date, time.max).replace(tzinfo=timezone.utc)
        elif isinstance(end_date, datetime):
            normalized_end = end_date.replace(tzinfo=timezone.utc) if end_date.tzinfo is None else end_date
    
    return normalized_start, normalized_end


def format_datetime(dt: Optional[datetime], format_str: str = "%Y-%m-%d %H:%M:%S") -> Optional[str]:
    """
    Format a datetime to a string.
    
    Args:
        dt: Datetime to format
        format_str: Format string (default: "%Y-%m-%d %H:%M:%S")
        
    Returns:
        Formatted string or None if dt is None
    """
    if dt is None:
        return None
    return dt.strftime(format_str)


def ensure_timezone(dt: datetime, tz: timezone = timezone.utc) -> datetime:
    """
    Ensure a datetime has a timezone (adds UTC if None).
    
    Args:
        dt: Datetime object
        tz: Timezone to use if dt has no timezone (default: UTC)
        
    Returns:
        Datetime with timezone
    """
    if dt.tzinfo is None:
        return dt.replace(tzinfo=tz)
    return dt

