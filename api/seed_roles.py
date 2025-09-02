import psycopg2
from api.core.db import get_conn, DB_ENABLED

DEFAULT_ROLES = [
    {"name": "admin", "description": "Full access"},
    {"name": "buyer", "description": "Can buy and view listings"},
    {"name": "analyst", "description": "Can view and score listings"},
]

def seed_roles():
    if not DB_ENABLED:
        print("Database is not enabled/configured.")
        return
    conn = get_conn()
    cur = conn.cursor()
    for role in DEFAULT_ROLES:
        cur.execute("SELECT id FROM roles WHERE name=%s", (role["name"],))
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO roles (name, description) VALUES (%s, %s)",
                (role["name"], role["description"])
            )
            print(f"Seeded role: {role['name']}")
    conn.commit()
    cur.close()
    conn.close()

if __name__ == "__main__":
    seed_roles()
