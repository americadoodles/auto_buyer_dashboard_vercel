import logging
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
            try:
                cur.execute("""
                    insert into users (id, email, username, hashed_password, role_id, is_confirmed)
                    values (%s, %s, %s, %s, %s, %s)
                    returning id, email, username, role_id, is_confirmed
                """, (str(user_id), user.email, user.username, hashed, user.role_id, False))
            except Exception as log_exc:
                logging.error(f"Failed to insert into users: {log_exc}")
            row = cur.fetchone()
            # Get role name
            role_idx = 3 if len(row) == 5 else 2
            cur.execute("SELECT name FROM roles WHERE id = %s", (row[role_idx],))
            role_name = cur.fetchone()[0]
            if len(row) == 5:
                return UserOut(id=row[0], email=row[1], username=row[2], role_id=row[3], role=role_name, is_confirmed=row[4])
            else:
                return UserOut(id=row[0], email=row[1], username=user.username, role_id=row[2], role=role_name, is_confirmed=row[3])
    finally:
        conn.close()

def get_user_by_email(email: str) -> Optional[UserInDB]:
    if not DB_ENABLED:
        return None
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
                select u.id, u.email, u.username, u.hashed_password, u.role_id, u.is_confirmed, r.name as role_name 
                from users u 
                left join roles r on u.role_id = r.id 
                where u.email=%s
            """, (email,))
            row = cur.fetchone()
            if row:
                    # Use the value directly if it's already boolean
                    is_confirmed = bool(row[5])
                    import logging
                    logging.info(f"Fetched user {row[1]}: is_confirmed raw value = {row[5]}, converted = {is_confirmed}")
                    return UserInDB(id=row[0], email=row[1], username=row[2], hashed_password=row[3], role_id=row[4], role=row[6], is_confirmed=is_confirmed)
    finally:
        conn.close()
    return None

def list_signup_requests() -> List[UserSignupRequest]:
    if not DB_ENABLED:
        return []
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("select id, email, username, password, role_id from user_signup_requests")
            requests = []
            for row in cur.fetchall():
                role_id = row[4]
                cur.execute("SELECT name FROM roles WHERE id = %s", (role_id,))
                role_name_row = cur.fetchone()
                role_name = role_name_row[0] if role_name_row else "buyer"
                requests.append(UserSignupRequest(id=row[0], email=row[1], username=row[2], password=row[3], role_id=role_id, role_name=role_name))
            return requests
    finally:
        conn.close()

def add_signup_request(request: UserSignupRequest) -> bool:
    if not DB_ENABLED:
        return False
    conn = get_conn(); assert conn is not None
    try:
        from api.repositories.roles import get_role_by_name
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
            hashed = hash_password(request.password)
            # Ensure role_id is set
            role_id = request.role_id
            if not role_id:
                buyer_role = get_role_by_name("buyer")
                role_id = buyer_role.id if buyer_role else None
            try:
                cur.execute("""
                    insert into user_signup_requests (id, email, username, password, role_id)
                    values (%s, %s, %s, %s, %s)
                """, (str(uuid4()), request.email, request.username, hashed, role_id))
            except Exception as log_exc:
                logging.error(f"Failed to insert into user_signup_requests: {log_exc}")
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
                cur.execute("select email, username, password, role_id from user_signup_requests where id=%s", (str(request.user_id),))
                row = cur.fetchone()
                if row:
                    if len(row) == 4:
                        email, username, password, role_id = row
                    else:
                        # Legacy without username
                        email, password, role_id = row
                        username = email.split('@')[0]
                    # password is already hashed, do not hash again
                    try:
                        cur.execute("""
                            insert into users (id, email, username, hashed_password, role_id, is_confirmed)
                            values (%s, %s, %s, %s, %s, %s)
                        """, (str(request.user_id), email, username, password, role_id, True))
                    except Exception as log_exc:
                        logging.error(f"Failed to insert confirmed user into users: {log_exc}")
                cur.execute("delete from user_signup_requests where id=%s", (str(request.user_id),))
                return True
            else:
                cur.execute("delete from user_signup_requests where id=%s", (str(request.user_id),))
                return True
    finally:
        conn.close()

def list_users() -> List[UserOut]:
    if not DB_ENABLED:
        return []
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
                select u.id, u.email, u.username, u.role_id, u.is_confirmed, r.name as role_name 
                from users u 
                left join roles r on u.role_id = r.id
            """)
            return [UserOut(id=row[0], email=row[1], username=row[2], role_id=row[3], role=row[5], is_confirmed=row[4]) for row in cur.fetchall()]
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

def update_user(user_id: UUID, update_data: dict) -> Optional[UserOut]:
    if not DB_ENABLED:
        return None
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            # Build dynamic update query
            update_fields = []
            update_values = []
            
            if 'email' in update_data and update_data['email'] is not None:
                update_fields.append("email = %s")
                update_values.append(update_data['email'])
            
            if 'username' in update_data and update_data['username'] is not None:
                update_fields.append("username = %s")
                update_values.append(update_data['username'])
            
            if 'role_id' in update_data and update_data['role_id'] is not None:
                update_fields.append("role_id = %s")
                update_values.append(update_data['role_id'])
            
            if 'is_confirmed' in update_data and update_data['is_confirmed'] is not None:
                update_fields.append("is_confirmed = %s")
                update_values.append(update_data['is_confirmed'])
            
            if not update_fields:
                return None
            
            update_values.append(str(user_id))
            query = f"UPDATE users SET {', '.join(update_fields)} WHERE id = %s RETURNING id, email, username, role_id, is_confirmed"
            
            cur.execute(query, update_values)
            row = cur.fetchone()
            
            if row:
                # Get role name
                cur.execute("SELECT name FROM roles WHERE id = %s", (row[3],))
                role_row = cur.fetchone()
                role_name = role_row[0] if role_row else "unknown"
                return UserOut(id=row[0], email=row[1], username=row[2], role_id=row[3], role=role_name, is_confirmed=row[4])
    finally:
        conn.close()
    return None

def update_user_password(user_id: UUID, current_password: str, new_password: str) -> bool:
    if not DB_ENABLED:
        return False
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            # First verify current password
            cur.execute("SELECT hashed_password FROM users WHERE id = %s", (str(user_id),))
            row = cur.fetchone()
            if not row:
                return False
            
            if not verify_password(current_password, row[0]):
                return False
            
            # Update password
            new_hashed = hash_password(new_password)
            cur.execute("UPDATE users SET hashed_password = %s WHERE id = %s", (new_hashed, str(user_id)))
            return True
    finally:
        conn.close()

def get_user_by_id(user_id: UUID) -> Optional[UserOut]:
    if not DB_ENABLED:
        return None
    conn = get_conn(); assert conn is not None
    try:
        with conn, conn.cursor() as cur:
            cur.execute("""
                select u.id, u.email, u.username, u.role_id, u.is_confirmed, r.name as role_name 
                from users u 
                left join roles r on u.role_id = r.id 
                where u.id=%s
            """, (str(user_id),))
            row = cur.fetchone()
            if row:
                return UserOut(id=row[0], email=row[1], username=row[2], role_id=row[3], role=row[5], is_confirmed=row[4])
    finally:
        conn.close()
    return None