import bcrypt
import uuid
from api.core.db import get_conn, DB_ENABLED

ADMIN_EMAIL = "ben@opulentintelligence.com"
ADMIN_PASSWORD = "ChangeMe123!"  # Change this after first login

if not DB_ENABLED:
    print("Database is not enabled/configured.")
    exit(1)

conn = get_conn()
cur = conn.cursor()

hashed_pw = bcrypt.hashpw(ADMIN_PASSWORD.encode(), bcrypt.gensalt()).decode()
admin_id = str(uuid.uuid4())

# Check if admin already exists
cur.execute("SELECT id FROM users WHERE email=%s", (ADMIN_EMAIL,))
if cur.fetchone():
    print("Super admin already exists.")
else:
    cur.execute(
        """
        INSERT INTO users (id, email, hashed_password, role, is_confirmed)
        VALUES (%s, %s, %s, %s, %s)
        """,
        (admin_id, ADMIN_EMAIL, hashed_pw, "admin", True)
    )
    print(f"Super admin seeded: {ADMIN_EMAIL}")

cur.close()
conn.close()
