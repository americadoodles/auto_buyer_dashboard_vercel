import logging
from typing import List, Optional
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection



class Role:
    def __init__(self, id: int, name: str, description: Optional[str]):
        self.id = id
        self.name = name
        self.description = description

# Get a role by name
def get_role_by_name(name: str) -> Optional[Role]:
    if not DB_ENABLED:
        return None
    with get_db_connection() as conn:
        if not conn:
            return None
            
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, description FROM roles WHERE name=%s", (name,))
                row = cur.fetchone()
                if row:
                    return Role(id=row[0], name=row[1], description=row[2])
                return None
        except Exception as e:
            logging.error(f"Database error in get_role_by_name: {e}")
            return None

# List all roles

def list_roles() -> List[Role]:
    if not DB_ENABLED:
        return []
    with get_db_connection() as conn:
        if not conn:
            return []
            
        try:
            with conn.cursor() as cur:
                cur.execute("SELECT id, name, description FROM roles")
                return [Role(id=row[0], name=row[1], description=row[2]) for row in cur.fetchall()]
        except Exception as e:
            logging.error(f"Database error in list_roles: {e}")
            return []

# Add a new role

def add_role(name: str, description: Optional[str]) -> Role:
    if not DB_ENABLED:
        return None
    with get_db_connection() as conn:
        if not conn:
            return None
            
        try:
            with conn.cursor() as cur:
                cur.execute("INSERT INTO roles (name, description) VALUES (%s, %s) RETURNING id, name, description", (name, description))
                row = cur.fetchone()
                return Role(id=row[0], name=row[1], description=row[2])
        except Exception as e:
            logging.error(f"Database error in add_role: {e}")
            return None

# Edit a role

def edit_role(role_id: int, name: str, description: Optional[str]) -> bool:
    if not DB_ENABLED:
        return False
    with get_db_connection() as conn:
        if not conn:
            return False
            
        try:
            with conn.cursor() as cur:
                cur.execute("UPDATE roles SET name=%s, description=%s WHERE id=%s", (name, description, role_id))
                return cur.rowcount > 0
        except Exception as e:
            logging.error(f"Database error in edit_role: {e}")
            return False

# Delete a role

def delete_role(role_id: int) -> bool:
    if not DB_ENABLED:
        return False
    with get_db_connection() as conn:
        if not conn:
            return False
            
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM roles WHERE id=%s", (role_id,))
                return cur.rowcount > 0
        except Exception as e:
            logging.error(f"Database error in delete_role: {e}")
            return False
