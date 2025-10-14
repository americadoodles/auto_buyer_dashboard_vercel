import psycopg2
from api.core.db import DB_ENABLED
from api.core.db_helpers import get_db_connection

DEFAULT_ROLES = [
    {"name": "admin", "description": "Full access"},
    {"name": "buyer", "description": "Can buy and view listings"},
    {"name": "analyst", "description": "Can view and score listings"},
]

def seed_roles():
    if not DB_ENABLED:
        print("Database is not enabled/configured.")
        return
    with get_db_connection() as conn:
        if not conn:
            print("No database connection available.")
            return
        with conn.cursor() as cur:
            for role in DEFAULT_ROLES:
                cur.execute("SELECT id FROM roles WHERE name=%s", (role["name"],))
                if not cur.fetchone():
                    cur.execute(
                        "INSERT INTO roles (name, description) VALUES (%s, %s)",
                        (role["name"], role["description"])
                    )
                    print(f"Seeded role: {role['name']}")

if __name__ == "__main__":
    seed_roles()
