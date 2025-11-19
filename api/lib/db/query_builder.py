"""
Database query builder utilities for dynamic SQL generation.
"""
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum


class QueryBuilder:
    """Helper class for building dynamic SQL queries."""
    
    @staticmethod
    def build_update_query(
        table_name: str,
        update_data: Dict[str, Any],
        where_clause: str = "id = %s",
        where_params: Optional[List[Any]] = None,
        exclude_fields: Optional[List[str]] = None,
        field_mapping: Optional[Dict[str, str]] = None,
        enum_fields: Optional[Dict[str, type]] = None,
        auto_timestamp: bool = True,
        updated_by_field: Optional[str] = None,
        updated_by_value: Optional[Any] = None
    ) -> Tuple[str, List[Any]]:
        """
        Build a dynamic UPDATE query.
        
        Args:
            table_name: Name of the table to update
            update_data: Dictionary of field: value pairs to update
            where_clause: WHERE clause (e.g., "id = %s")
            where_params: Parameters for WHERE clause
            exclude_fields: Fields to exclude from update
            field_mapping: Map schema field names to DB column names
            enum_fields: Map field names to Enum types for value extraction
            auto_timestamp: Whether to automatically add updated_at = now()
            updated_by_field: Field name for updated_by (e.g., "updated_by")
            updated_by_value: Value for updated_by field
            
        Returns:
            Tuple of (query_string, parameter_list)
        """
        exclude_fields = exclude_fields or []
        field_mapping = field_mapping or {}
        enum_fields = enum_fields or {}
        where_params = where_params or []
        
        update_fields = []
        update_values = []
        
        for field, value in update_data.items():
            if field in exclude_fields or value is None:
                continue
                
            # Handle enum fields
            if field in enum_fields and isinstance(value, Enum):
                db_value = value.value
            else:
                db_value = value
            
            # Map field name to DB column name if needed
            db_field = field_mapping.get(field, field)
            update_fields.append(f"{db_field} = %s")
            update_values.append(db_value)
        
        if not update_fields:
            raise ValueError("No fields to update")
        
        # Add automatic timestamp
        if auto_timestamp:
            update_fields.append("updated_at = now()")
        
        # Add updated_by if provided
        if updated_by_field and updated_by_value is not None:
            update_fields.append(f"{updated_by_field} = %s")
            update_values.append(updated_by_value)
        
        # Build final query
        query = f"""
            UPDATE {table_name}
            SET {', '.join(update_fields)}
            WHERE {where_clause}
        """
        
        # Combine update values with where params
        params = update_values + where_params
        
        return query.strip(), params
    
    @staticmethod
    def build_where_clause(
        filters: Dict[str, Any],
        field_mapping: Optional[Dict[str, str]] = None,
        operators: Optional[Dict[str, str]] = None
    ) -> Tuple[str, List[Any]]:
        """
        Build a WHERE clause from a dictionary of filters.
        
        Args:
            filters: Dictionary of field: value filters
            field_mapping: Map schema field names to DB column names
            operators: Map field names to SQL operators (default: "=")
            
        Returns:
            Tuple of (where_clause_string, parameter_list)
        """
        field_mapping = field_mapping or {}
        operators = operators or {}
        
        conditions = []
        params = []
        
        for field, value in filters.items():
            if value is None:
                continue
            
            db_field = field_mapping.get(field, field)
            operator = operators.get(field, "=")
            
            if operator in ("IN", "in"):
                # Handle IN clause
                placeholders = ", ".join(["%s"] * len(value))
                conditions.append(f"{db_field} IN ({placeholders})")
                params.extend(value)
            elif operator in ("ILIKE", "ilike", "LIKE", "like"):
                # Handle LIKE/ILIKE clause
                conditions.append(f"{db_field} {operator} %s")
                params.append(f"%{value}%")
            elif operator in (">=", "<=", ">", "<"):
                # Handle comparison operators
                conditions.append(f"{db_field} {operator} %s")
                params.append(value)
            else:
                # Default to equality
                conditions.append(f"{db_field} = %s")
                params.append(value)
        
        if not conditions:
            return "", []
        
        where_clause = " AND ".join(conditions)
        return where_clause, params
    
    @staticmethod
    def build_select_query(
        table_name: str,
        columns: Optional[List[str]] = None,
        joins: Optional[List[str]] = None,
        where_clause: Optional[str] = None,
        order_by: Optional[str] = None,
        limit: Optional[int] = None,
        offset: Optional[int] = None,
        group_by: Optional[str] = None
    ) -> str:
        """
        Build a SELECT query.
        
        Args:
            table_name: Name of the table (or base table with alias)
            columns: List of columns to select (default: "*")
            joins: List of JOIN clauses
            where_clause: WHERE clause
            order_by: ORDER BY clause
            limit: LIMIT value
            offset: OFFSET value
            group_by: GROUP BY clause
            
        Returns:
            SQL query string
        """
        columns_str = ", ".join(columns) if columns else "*"
        
        query_parts = [f"SELECT {columns_str}", f"FROM {table_name}"]
        
        if joins:
            query_parts.extend(joins)
        
        if where_clause:
            query_parts.append(f"WHERE {where_clause}")
        
        if group_by:
            query_parts.append(f"GROUP BY {group_by}")
        
        if order_by:
            query_parts.append(f"ORDER BY {order_by}")
        
        if limit:
            query_parts.append(f"LIMIT {limit}")
        
        if offset:
            query_parts.append(f"OFFSET {offset}")
        
        return " ".join(query_parts)

