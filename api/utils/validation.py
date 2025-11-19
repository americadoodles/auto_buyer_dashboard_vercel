"""
Validation utility functions.
"""
from typing import Any, Optional, List
from uuid import UUID


def validate_uuid(value: Any, field_name: str = "id") -> UUID:
    """
    Validate and convert a value to UUID.
    
    Args:
        value: Value to validate (can be str, UUID, or None)
        field_name: Name of the field for error messages
        
    Returns:
        UUID object
        
    Raises:
        ValueError: If value cannot be converted to UUID
    """
    if value is None:
        raise ValueError(f"{field_name} cannot be None")
    
    if isinstance(value, UUID):
        return value
    
    if isinstance(value, str):
        try:
            return UUID(value)
        except ValueError:
            raise ValueError(f"{field_name} must be a valid UUID")
    
    raise ValueError(f"{field_name} must be a UUID or UUID string")


def validate_not_empty(value: Any, field_name: str = "field") -> Any:
    """
    Validate that a value is not None or empty.
    
    Args:
        value: Value to validate
        field_name: Name of the field for error messages
        
    Returns:
        The value if valid
        
    Raises:
        ValueError: If value is None or empty
    """
    if value is None:
        raise ValueError(f"{field_name} cannot be None")
    
    if isinstance(value, str) and not value.strip():
        raise ValueError(f"{field_name} cannot be empty")
    
    if isinstance(value, (list, dict)) and len(value) == 0:
        raise ValueError(f"{field_name} cannot be empty")
    
    return value


def validate_range(
    value: int,
    min_value: Optional[int] = None,
    max_value: Optional[int] = None,
    field_name: str = "value"
) -> int:
    """
    Validate that a numeric value is within a range.
    
    Args:
        value: Value to validate
        min_value: Minimum allowed value
        max_value: Maximum allowed value
        field_name: Name of the field for error messages
        
    Returns:
        The value if valid
        
    Raises:
        ValueError: If value is outside the allowed range
    """
    if min_value is not None and value < min_value:
        raise ValueError(f"{field_name} must be at least {min_value}")
    
    if max_value is not None and value > max_value:
        raise ValueError(f"{field_name} must be at most {max_value}")
    
    return value

