import os
import bcrypt
import uuid
from api.core.db import get_conn, DB_ENABLED

ADMIN_EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", ADMIN_EMAIL.split("@")[0])
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "ChangeMe123!")  # Change this after first login

if not DB_ENABLED:
    print("Database is not enabled/configured.")
    raise SystemExit(1)

conn = get_conn()
assert conn is not None
cur = conn.cursor()

try:
    # Ensure admin role exists and get its id
    cur.execute("SELECT id FROM roles WHERE name=%s", ("admin",))
    row = cur.fetchone()
    if row:
        admin_role_id = row[0]
    else:
        cur.execute(
            "INSERT INTO roles (name, description) VALUES (%s, %s) RETURNING id",
            ("admin", "Full access to all features"),
        )
        admin_role_id = cur.fetchone()[0]

    # Check if admin user already exists
    cur.execute("SELECT id FROM users WHERE email=%s", (ADMIN_EMAIL,))
    if cur.fetchone():
        print("Super admin already exists.")
    else:
        hashed_pw = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
        admin_id = str(uuid.uuid4())
        try:
            # Preferred path with username column
            cur.execute(
                """
                INSERT INTO users (id, email, username, hashed_password, role_id, is_confirmed)
                VALUES (%s, %s, %s, %s, %s, %s)
                """,
                (admin_id, ADMIN_EMAIL, ADMIN_USERNAME, hashed_pw, admin_role_id, True),
            )
        except Exception:
            # Fallback for legacy schema without username
            cur.execute(
                """
                INSERT INTO users (id, email, hashed_password, role_id, is_confirmed)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (admin_id, ADMIN_EMAIL, hashed_pw, admin_role_id, True),
            )
        print(f"Super admin seeded: {ADMIN_EMAIL}")
finally:
    cur.close()
    conn.close()
