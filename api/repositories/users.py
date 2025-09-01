import bcrypt
from uuid import uuid4, UUID
from typing import Optional, List
from ..core.db import get_conn, DB_ENABLED
from ..schemas.user import UserCreate, UserOut, UserInDB, UserSignupRequest, UserConfirmRequest, UserRemoveRequest

# User repository functions

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_user(user: UserCreate) -> Optional[UserOut]:
    if not DB_ENABLED:
        return None
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            hashed = hash_password(user.password)
            user_id = uuid4()
            cur.execute("""
                insert into users (id, email, hashed_password, role, is_confirmed)
                values (%s, %s, %s, %s, %s)
                returning id, email, role, is_confirmed
            """, (str(user_id), user.email, hashed, user.role, False))
            row = cur.fetchone()
            return UserOut(id=row[0], email=row[1], role=row[2], is_confirmed=row[3])
    finally:
        conn.close()

def get_user_by_email(email: str) -> Optional[UserInDB]:
    if not DB_ENABLED:
        return None
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
                select id, email, hashed_password, role, is_confirmed from users where email=%s
            """, (email,))
            row = cur.fetchone()
            if row:
                return UserInDB(id=row[0], email=row[1], hashed_password=row[2], role=row[3], is_confirmed=row[4])
    finally:
        conn.close()
    return None

def list_signup_requests() -> List[UserSignupRequest]:
    if not DB_ENABLED:
        return []
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("select id, email, password from user_signup_requests")
            return [UserSignupRequest(id=row[0], email=row[1], password=row[2]) for row in cur.fetchall()]
    finally:
        conn.close()

def add_signup_request(request: UserSignupRequest) -> bool:
    if not DB_ENABLED:
        return False
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            # Check for existing email in users
            cur.execute("select 1 from users where email=%s", (request.email,))
            if cur.fetchone():
                return False
            # Check for existing email in signup requests
            cur.execute("select 1 from user_signup_requests where email=%s", (request.email,))
            if cur.fetchone():
                return False
            # Hash password before storing
            from .users import hash_password
            hashed = hash_password(request.password)
            cur.execute("""
                insert into user_signup_requests (id, email, password)
                values (%s, %s, %s)
            """, (str(uuid4()), request.email, hashed))
            return True
    finally:
        conn.close()

def confirm_user_signup(request: UserConfirmRequest) -> bool:
    if not DB_ENABLED:
        return False
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            if request.confirm:
                # Move from signup_requests to users
                cur.execute("select email, password from user_signup_requests where id=%s", (str(request.user_id),))
                row = cur.fetchone()
                if row:
                    email, password = row
                    hashed = hash_password(password)
                    cur.execute("""
                        insert into users (id, email, hashed_password, role, is_confirmed)
                        values (%s, %s, %s, %s, %s)
                    """, (str(request.user_id), email, hashed, 'buyer', True))
                cur.execute("delete from user_signup_requests where id=%s", (str(request.user_id),))
                return True
            else:
                cur.execute("delete from user_signup_requests where id=%s", (str(request.user_id),))
                return True
    finally:
        conn.close()

def remove_user(request: UserRemoveRequest) -> bool:
    if not DB_ENABLED:
        return False
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("delete from users where id=%s", (str(request.user_id),))
            return True
    finally:
        conn.close()
