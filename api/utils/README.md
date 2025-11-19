# API Utility Functions

This directory contains common utility functions used throughout the API.

## Modules

### `date_utils.py`
Date and time manipulation utilities.

```python
from api.utils.date_utils import get_today_range, parse_date_range

# Get start and end of today in UTC
start, end = get_today_range()

# Parse and normalize date range
start_date, end_date = parse_date_range(start_date, end_date)
```

### `validation.py`
Common validation functions.

```python
from api.utils.validation import validate_uuid, validate_not_empty, validate_range

# Validate UUID
user_id = validate_uuid(request.user_id, "user_id")

# Validate not empty
name = validate_not_empty(request.name, "name")

# Validate range
limit = validate_range(request.limit, min_value=1, max_value=1000, field_name="limit")
```

### `pagination.py`
Pagination utilities.

```python
from api.utils.pagination import normalize_pagination, calculate_total_pages

# Normalize pagination parameters
skip, limit = normalize_pagination(skip=0, limit=50, default_limit=100, max_limit=1000)

# Calculate total pages
total_pages = calculate_total_pages(total_items=250, items_per_page=50)
```

### `response.py`
Response formatting utilities.

```python
from api.utils.response import format_paginated_response, format_success_response, format_error_response

# Format paginated response
response = format_paginated_response(
    items=items,
    total=total_count,
    skip=0,
    limit=100
)

# Format success response
response = format_success_response(data=result, message="Operation successful")

# Format error response
response = format_error_response(
    message="Validation failed",
    errors=["Field 'name' is required"],
    code="VALIDATION_ERROR"
)
```

