"""
Response formatting utilities.
"""
from typing import Any, Optional, List, Dict
from pydantic import BaseModel


def format_paginated_response(
    items: List[Any],
    total: int,
    skip: int = 0,
    limit: int = 100
) -> Dict[str, Any]:
    """
    Format a paginated response.
    
    Args:
        items: List of items for current page
        total: Total number of items
        skip: Number of items skipped
        limit: Items per page
        
    Returns:
        Dictionary with pagination metadata and items
    """
    return {
        "items": items,
        "total": total,
        "skip": skip,
        "limit": limit,
        "has_more": (skip + len(items)) < total
    }


def format_success_response(
    data: Any,
    message: Optional[str] = None
) -> Dict[str, Any]:
    """
    Format a success response.
    
    Args:
        data: Response data
        message: Optional success message
        
    Returns:
        Dictionary with success status and data
    """
    response = {
        "success": True,
        "data": data
    }
    if message:
        response["message"] = message
    return response


def format_error_response(
    message: str,
    errors: Optional[List[str]] = None,
    code: Optional[str] = None
) -> Dict[str, Any]:
    """
    Format an error response.
    
    Args:
        message: Error message
        errors: Optional list of specific errors
        code: Optional error code
        
    Returns:
        Dictionary with error information
    """
    response = {
        "success": False,
        "error": message
    }
    if errors:
        response["errors"] = errors
    if code:
        response["code"] = code
    return response

