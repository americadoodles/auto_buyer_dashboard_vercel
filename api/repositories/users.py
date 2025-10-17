import logging
import bcrypt
from uuid import uuid4, UUID
from typing import Optional, List
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.user import (
    UserCreate,
    UserOut,
    UserInDB,
    UserSignupRequest,
    UserConfirmRequest,
    UserRemoveRequest,
)

logger = logging.getLogger(__name__)

# -----------------------------------------------------------------------------
# Password helpers
# -----------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))

# -----------------------------------------------------------------------------
# User repository
# -----------------------------------------------------------------------------

def create_user(user: UserCreate) -> Optional[UserOut]:
    if not DB_ENABLED:
        return None

    with get_db_connection() as conn:
        if not conn:
            return None
        try:
            with conn.cursor() as cur:
                hashed = hash_password(user.password)
                user_id = uuid4()
                row = None
                try:
                    cur.execute(
                        """
                        insert into users (id, email, username, hashed_password, role_id, is_confirmed)
                        values (%s, %s, %s, %s, %s, %s)
                        returning id, email, username, role_id, is_confirmed
                        """,
                        (str(user_id), user.email, user.username, hashed, user.role_id, False),
                    )
                    row = cur.fetchone()
                except Exception as log_exc:
                    logger.error("Failed to insert into users: %s", log_exc, exc_info=True)
                    return None

                if not row:
                    return None

                # role_id index depends on returned cols (we always return 5 above)
                role_id = row[3]
                cur.execute("SELECT name FROM roles WHERE id = %s", (role_id,))
                role_row = cur.fetchone()
                role_name = role_row[0] if role_row else "unknown"

                return UserOut(
                    id=row[0],
                    email=row[1],
                    username=row[2],
                    role_id=row[3],
                    role=role_name,
                    is_confirmed=row[4],
                )
        except Exception as e:
            logger.error("Error in create_user: %s", e, exc_info=True)
            return None

def get_user_by_email(email: str) -> Optional[UserInDB]:
    if not DB_ENABLED:
        return None

    with get_db_connection() as conn:
        if not conn:
            return None
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select u.id, u.email, u.username, u.hashed_password, u.role_id, u.is_confirmed, r.name as role_name
                    from users u
                    left join roles r on u.role_id = r.id
                    where u.email = %s
                    """,
                    (email,),
                )
                row = cur.fetchone()
                if row:
                    is_confirmed = bool(row[5])
                    logger.info(
                        "Fetched user %s: is_confirmed raw=%s converted=%s",
                        row[1], row[5], is_confirmed
                    )
                    return UserInDB(
                        id=row[0],
                        email=row[1],
                        username=row[2],
                        hashed_password=row[3],
                        role_id=row[4],
                        role=row[6],
                        is_confirmed=is_confirmed,
                    )
                return None
        except Exception as e:
            logger.error("Error in get_user_by_email: %s", e, exc_info=True)
            return None

def list_signup_requests() -> List[UserSignupRequest]:
    if not DB_ENABLED:
        return []

    with get_db_connection() as conn:
        if not conn:
            return []
        try:
            with conn.cursor() as cur:
                cur.execute("select id, email, username, password, role_id from user_signup_requests")
                requests: List[UserSignupRequest] = []
                for row in cur.fetchall():
                    role_id = row[4]
                    cur.execute("SELECT name FROM roles WHERE id = %s", (role_id,))
                    role_name_row = cur.fetchone()
                    role_name = role_name_row[0] if role_name_row else "buyer"
                    requests.append(
                        UserSignupRequest(
                            id=row[0],
                            email=row[1],
                            username=row[2],
                            password=row[3],  # already hashed at insert time below
                            role_id=role_id,
                            role_name=role_name,
                        )
                    )
                return requests
        except Exception as e:
            logger.error("Error in list_signup_requests: %s", e, exc_info=True)
            return []

def add_signup_request(request: UserSignupRequest) -> bool:
    if not DB_ENABLED:
        return False

    with get_db_connection() as conn:
        if not conn:
            return False
        try:
            # Lazy import to avoid cycles (if any)
            from api.repositories.roles import get_role_by_name  # type: ignore
            with conn.cursor() as cur:
                # Check for existing email in users
                cur.execute("select 1 from users where email = %s", (request.email,))
                if cur.fetchone():
                    return False
                # Check for existing email in signup requests
                cur.execute("select 1 from user_signup_requests where email = %s", (request.email,))
                if cur.fetchone():
                    return False

                # Hash password before storing
                hashed = hash_password(request.password)

                # Ensure role_id is set (default buyer)
                role_id = request.role_id
                if not role_id:
                    buyer_role = get_role_by_name("buyer")
                    role_id = buyer_role.id if buyer_role else None

                try:
                    cur.execute(
                        """
                        insert into user_signup_requests (id, email, username, password, role_id)
                        values (%s, %s, %s, %s, %s)
                        """,
                        (str(uuid4()), request.email, request.username, hashed, role_id),
                    )
                except Exception as log_exc:
                    logger.error(
                        "Failed to insert into user_signup_requests: %s", log_exc, exc_info=True
                    )
                    return False
                return True
        except Exception as e:
            logger.error("Database error: %s", e, exc_info=True)
            return False

def confirm_user_signup(request: UserConfirmRequest) -> bool:
    if not DB_ENABLED:
        return False

    with get_db_connection() as conn:
        if not conn:
            return False
        try:
            with conn.cursor() as cur:
                if request.confirm:
                    # Move from signup_requests to users
                    cur.execute(
                        "select email, username, password, role_id from user_signup_requests where id = %s",
                        (str(request.user_id),),
                    )
                    row = cur.fetchone()
                    if row:
                        if len(row) == 4:
                            email, username, password, role_id = row
                        else:
                            # Legacy without username
                            email, password, role_id = row
                            username = email.split("@")[0]
                        try:
                            cur.execute(
                                """
                                insert into users (id, email, username, hashed_password, role_id, is_confirmed)
                                values (%s, %s, %s, %s, %s, %s)
                                """,
                                (str(request.user_id), email, username, password, role_id, True),
                            )
                        except Exception as log_exc:
                            logger.error(
                                "Failed to insert confirmed user into users: %s",
                                log_exc,
                                exc_info=True,
                            )
                    # Delete request regardless (accepted or missing row)
                    cur.execute("delete from user_signup_requests where id = %s", (str(request.user_id),))
                    return True
                else:
                    # Reject request: simply delete
                    cur.execute("delete from user_signup_requests where id = %s", (str(request.user_id),))
                    return True
        except Exception as e:
            logger.error("Database error: %s", e, exc_info=True)
            return False

def list_users() -> List[UserOut]:
    if not DB_ENABLED:
        return []

    with get_db_connection() as conn:
        if not conn:
            return []
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select u.id, u.email, u.username, u.role_id, u.is_confirmed, r.name as role_name
                    from users u
                    left join roles r on u.role_id = r.id
                    """
                )
                return [
                    UserOut(
                        id=row[0],
                        email=row[1],
                        username=row[2],
                        role_id=row[3],
                        role=row[5],
                        is_confirmed=row[4],
                    )
                    for row in cur.fetchall()
                ]
        except Exception as e:
            logger.error("Database error: %s", e, exc_info=True)
            return []

def remove_user(request: UserRemoveRequest) -> bool:
    if not DB_ENABLED:
        return False

    with get_db_connection() as conn:
        if not conn:
            return False
        try:
            with conn.cursor() as cur:
                cur.execute("delete from users where id = %s", (str(request.user_id),))
                return True
        except Exception as e:
            logger.error("Database error: %s", e, exc_info=True)
            return False

def update_user(user_id: UUID, update_data: dict) -> Optional[UserOut]:
    if not DB_ENABLED:
        return None

    with get_db_connection() as conn:
        if not conn:
            return None
        try:
            with conn.cursor() as cur:
                # Build dynamic update query
                update_fields = []
                update_values = []

                if "email" in update_data and update_data["email"] is not None:
                    update_fields.append("email = %s")
                    update_values.append(update_data["email"])

                if "username" in update_data and update_data["username"] is not None:
                    update_fields.append("username = %s")
                    update_values.append(update_data["username"])

                if "role_id" in update_data and update_data["role_id"] is not None:
                    update_fields.append("role_id = %s")
                    update_values.append(update_data["role_id"])

                if "is_confirmed" in update_data and update_data["is_confirmed"] is not None:
                    update_fields.append("is_confirmed = %s")
                    update_values.append(update_data["is_confirmed"])

                if not update_fields:
                    return None

                update_values.append(str(user_id))
                query = (
                    f"UPDATE users SET {', '.join(update_fields)} "
                    "WHERE id = %s RETURNING id, email, username, role_id, is_confirmed"
                )

                cur.execute(query, update_values)
                row = cur.fetchone()
                if row:
                    # Get role name
                    cur.execute("SELECT name FROM roles WHERE id = %s", (row[3],))
                    role_row = cur.fetchone()
                    role_name = role_row[0] if role_row else "unknown"
                    return UserOut(
                        id=row[0],
                        email=row[1],
                        username=row[2],
                        role_id=row[3],
                        role=role_name,
                        is_confirmed=row[4],
                    )
                return None
        except Exception as e:
            logger.error("Database error: %s", e, exc_info=True)
            return None

def update_user_password(user_id: UUID, current_password: str, new_password: str) -> bool:
    if not DB_ENABLED:
        return False

    with get_db_connection() as conn:
        if not conn:
            return False
        try:
            with conn.cursor() as cur:
                # Verify current password
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
        except Exception as e:
            logger.error("Database error: %s", e, exc_info=True)
            return False

def get_user_by_id(user_id: UUID) -> Optional[UserOut]:
    if not DB_ENABLED:
        return None

    with get_db_connection() as conn:
        if not conn:
            return None
        try:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    select u.id, u.email, u.username, u.role_id, u.is_confirmed, r.name as role_name
                    from users u
                    left join roles r on u.role_id = r.id
                    where u.id = %s
                    """,
                    (str(user_id),),
                )
                row = cur.fetchone()
                if row:
                    return UserOut(
                        id=row[0],
                        email=row[1],
                        username=row[2],
                        role_id=row[3],
                        role=row[5],
                        is_confirmed=row[4],
                    )
                return None
        except Exception as e:
            logger.error("Database error: %s", e, exc_info=True)
            return None
