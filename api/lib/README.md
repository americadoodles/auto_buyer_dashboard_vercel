# API Library Modules

This directory contains reusable library code for database operations and other common functionality.

## Structure

### `db/` - Database Query Builders

#### `query_builder.py`
Provides utilities for building dynamic SQL queries.

**QueryBuilder.build_update_query()**
Builds dynamic UPDATE queries with automatic timestamp handling.

```python
from api.lib.db.query_builder import QueryBuilder

query, params = QueryBuilder.build_update_query(
    table_name="listings",
    update_data={"price": 25000, "miles": 50000},
    where_clause="id = %s",
    where_params=[listing_id],
    auto_timestamp=True,
    updated_by_field="updated_by",
    updated_by_value=user_id
)
```

**QueryBuilder.build_where_clause()**
Builds WHERE clauses from filter dictionaries.

```python
where_clause, params = QueryBuilder.build_where_clause(
    filters={
        "status": "active",
        "price": 25000,
        "name": "Tesla"
    },
    operators={"name": "ILIKE"}  # Use ILIKE for name search
)
```

**QueryBuilder.build_select_query()**
Builds SELECT queries with joins, filters, and pagination.

```python
query = QueryBuilder.build_select_query(
    table_name="listings l",
    columns=["l.id", "l.price", "v.make", "v.model"],
    joins=["LEFT JOIN vehicles v ON v.vehicle_key = l.vehicle_key"],
    where_clause="l.price > %s",
    order_by="l.created_at DESC",
    limit=100,
    offset=0
)
```

