# Backend Modularization

This document describes the new modular structure of the backend API.

## Directory Structure

```
api/
├── lib/                    # Reusable library code
│   ├── db/                # Database query builders
│   │   └── query_builder.py
│   └── README.md
├── utils/                  # Utility functions
│   ├── date_utils.py      # Date/time utilities
│   ├── validation.py      # Validation functions
│   ├── pagination.py      # Pagination helpers
│   ├── response.py        # Response formatting
│   └── README.md
├── helpers/                # Route-level helpers
│   ├── error_handling.py  # Error handling patterns
│   └── README.md
├── core/                   # Core functionality (existing)
├── repositories/           # Data access layer
├── routes/                 # API routes
├── schemas/                # Pydantic schemas
└── services/              # Business logic services
```

## Key Benefits

1. **Reusability**: Common patterns are extracted into reusable modules
2. **Maintainability**: Changes to common functionality happen in one place
3. **Consistency**: Standardized patterns across the codebase
4. **Testability**: Utility functions can be tested independently
5. **Readability**: Routes and repositories are cleaner and more focused

## Usage Examples

### Using Query Builder

**Before:**
```python
update_fields = []
update_values = []
for field, value in update_data.model_dump(exclude_unset=True).items():
    if value is not None:
        update_fields.append(f"{field} = %s")
        update_values.append(value)
update_fields.append("updated_at = now()")
query = f"UPDATE table SET {', '.join(update_fields)} WHERE id = %s"
```

**After:**
```python
from api.lib.db.query_builder import QueryBuilder

query, params = QueryBuilder.build_update_query(
    table_name="table",
    update_data=update_data.model_dump(exclude_unset=True),
    where_clause="id = %s",
    where_params=[record_id],
    auto_timestamp=True
)
```

### Using Error Handling

**Before:**
```python
@router.post("/")
def create_lead(lead: LeadCreate, current_user: UserOut = Depends(get_current_user)):
    try:
        return create_lead(lead, current_user.id)
    except Exception as e:
        logging.error(f"Error creating lead: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create lead")
```

**After:**
```python
from api.helpers.error_handling import handle_repository_errors

@router.post("/")
@handle_repository_errors("create_lead", 500, "Failed to create lead")
def create_lead(lead: LeadCreate, current_user: UserOut = Depends(get_current_user)):
    return create_lead(lead, current_user.id)
```

### Using Pagination Utilities

**Before:**
```python
skip = skip or 0
if skip < 0:
    skip = 0
limit = limit or 100
if limit > 1000:
    limit = 1000
```

**After:**
```python
from api.utils.pagination import normalize_pagination

skip, limit = normalize_pagination(skip=skip, limit=limit, default_limit=100, max_limit=1000)
```

### Using Date Utilities

**Before:**
```python
today = date.today()
today_start = datetime.combine(today, datetime.min.time()).replace(tzinfo=timezone.utc)
today_end = datetime.combine(today, datetime.max.time()).replace(tzinfo=timezone.utc)
```

**After:**
```python
from api.utils.date_utils import get_today_range

today_start, today_end = get_today_range()
```

## Migration Guide

1. **Identify common patterns** in your repositories and routes
2. **Extract reusable code** into appropriate lib/utils/helpers modules
3. **Update imports** to use the new modules
4. **Refactor functions** to use the new utilities
5. **Test thoroughly** to ensure functionality is preserved

## Next Steps

- Gradually refactor existing repositories to use QueryBuilder
- Apply error handling decorators to routes
- Use pagination utilities in list endpoints
- Standardize date handling across the codebase

