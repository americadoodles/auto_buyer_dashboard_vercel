# API Helper Functions

This directory contains helper functions for routes and API endpoints.

## Modules

### `error_handling.py`
Common error handling patterns for API routes.

**handle_repository_errors decorator**
Automatically converts repository errors to HTTP exceptions.

```python
from api.helpers.error_handling import handle_repository_errors

@handle_repository_errors("create_lead", 500, "Failed to create lead")
def create_lead(lead_data: LeadCreate):
    return create_lead_repository(lead_data)
```

**safe_execute function**
Safely execute a function with error handling.

```python
from api.helpers.error_handling import safe_execute

result = safe_execute(
    lambda: create_lead(lead_data),
    operation_name="create_lead",
    default_value=None,
    raise_on_error=True
)
```

