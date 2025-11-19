"""
Pagination utility functions.
"""
from typing import Optional, Tuple


def normalize_pagination(
    skip: Optional[int] = None,
    limit: Optional[int] = None,
    default_limit: int = 100,
    max_limit: int = 1000
) -> Tuple[int, int]:
    """
    Normalize pagination parameters.
    
    Args:
        skip: Number of records to skip (default: 0)
        limit: Maximum number of records to return (default: default_limit)
        default_limit: Default limit if not provided
        max_limit: Maximum allowed limit
        
    Returns:
        Tuple of (normalized_skip, normalized_limit)
    """
    skip = skip or 0
    if skip < 0:
        skip = 0
    
    limit = limit or default_limit
    if limit < 1:
        limit = default_limit
    if limit > max_limit:
        limit = max_limit
    
    return skip, limit


def calculate_total_pages(total_items: int, items_per_page: int) -> int:
    """
    Calculate total number of pages.
    
    Args:
        total_items: Total number of items
        items_per_page: Items per page
        
    Returns:
        Total number of pages
    """
    if items_per_page <= 0:
        return 0
    return (total_items + items_per_page - 1) // items_per_page

