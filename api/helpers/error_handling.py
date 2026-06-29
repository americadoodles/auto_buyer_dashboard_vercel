"""
Common error handling patterns for API routes.
"""
import logging
from typing import Callable, TypeVar, Any
from functools import wraps
from fastapi import HTTPException

T = TypeVar('T')

logger = logging.getLogger(__name__)


def handle_repository_errors(
    operation_name: str,
    default_status_code: int = 500,
    default_message: str = "An error occurred"
):
    """
    Decorator to handle repository errors and convert them to HTTP exceptions.
    
    Args:
        operation_name: Name of the operation for logging
        default_status_code: Default HTTP status code
        default_message: Default error message
        
    Usage:
        @handle_repository_errors("create_lead", 500, "Failed to create lead")
        def create_lead(...):
            ...
    """
    def decorator(func: Callable[..., T]) -> Callable[..., T]:
        @wraps(func)
        def wrapper(*args, **kwargs) -> T:
            try:
                return func(*args, **kwargs)
            except ValueError as e:
                logger.warning(f"{operation_name} validation error: {str(e)}")
                raise HTTPException(status_code=400, detail=str(e))
            except Exception as e:
                logger.error(f"{operation_name} error: {str(e)}", exc_info=True)
                raise HTTPException(
                    status_code=default_status_code,
                    detail=default_message
                )
        return wrapper
    return decorator


def safe_execute(
    func: Callable[..., T],
    operation_name: str,
    default_value: Any = None,
    raise_on_error: bool = False
) -> T:
    """
    Safely execute a function with error handling.
    
    Args:
        func: Function to execute
        operation_name: Name of the operation for logging
        default_value: Value to return on error if raise_on_error is False
        raise_on_error: Whether to raise HTTPException on error
        
    Returns:
        Result of function execution or default_value on error
    """
    try:
        return func()
    except ValueError as e:
        logger.warning(f"{operation_name} validation error: {str(e)}")
        if raise_on_error:
            raise HTTPException(status_code=400, detail=str(e))
        return default_value
    except Exception as e:
        logger.error(f"{operation_name} error: {str(e)}", exc_info=True)
        if raise_on_error:
            raise HTTPException(status_code=500, detail=f"Failed to {operation_name}")
        return default_value

