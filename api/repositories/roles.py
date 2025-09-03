from typing import List, Optional
from ..core.db import get_conn, DB_ENABLED



class Role:
    def __init__(self, id: int, name: str, description: Optional[str]):
        self.id = id
        self.name = name
        self.description = description

# Get a role by name
def get_role_by_name(name: str) -> Optional[Role]:
    if not DB_ENABLED:
        return None
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT id, name, description FROM roles WHERE name=%s", (name,))
            row = cur.fetchone()
            if row:
                return Role(id=row[0], name=row[1], description=row[2])
            return None
    finally:
        conn.close()

# List all roles

def list_roles() -> List[Role]:
    if not DB_ENABLED:
        return []
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("SELECT id, name, description FROM roles")
            return [Role(id=row[0], name=row[1], description=row[2]) for row in cur.fetchall()]
    finally:
        conn.close()

# Add a new role

def add_role(name: str, description: Optional[str]) -> Role:
    if not DB_ENABLED:
        return None
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("INSERT INTO roles (name, description) VALUES (%s, %s) RETURNING id, name, description", (name, description))
            row = cur.fetchone()
            return Role(id=row[0], name=row[1], description=row[2])
    finally:
        conn.close()

# Edit a role

def edit_role(role_id: int, name: str, description: Optional[str]) -> bool:
    if not DB_ENABLED:
        return False
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("UPDATE roles SET name=%s, description=%s WHERE id=%s", (name, description, role_id))
            return cur.rowcount > 0
    finally:
        conn.close()

# Delete a role

def delete_role(role_id: int) -> bool:
    if not DB_ENABLED:
        return False
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("DELETE FROM roles WHERE id=%s", (role_id,))
            return cur.rowcount > 0
    finally:
        conn.close()
