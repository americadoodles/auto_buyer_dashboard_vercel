from datetime import datetime, timedelta, timezone
from typing import Optional
import base64
import json
import hmac
import hashlib
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

from .config import settings
from ..schemas.user import UserOut
from ..repositories.users import get_user_by_email


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/users/login")


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = '=' * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _sign(message: bytes, secret: str) -> bytes:
    return hmac.new(secret.encode("utf-8"), message, hashlib.sha256).digest()


def create_access_token(subject: dict, expires_minutes: Optional[int] = None) -> str:
    if settings.JWT_ALGORITHM != "HS256":
        # For now we only implement HS256 locally
        raise HTTPException(status_code=500, detail="Unsupported JWT algorithm")
    header = {"alg": "HS256", "typ": "JWT"}
    exp = datetime.now(tz=timezone.utc) + timedelta(minutes=(expires_minutes or settings.JWT_EXPIRES_MINUTES))
    payload = subject.copy()
    payload["exp"] = int(exp.timestamp())

    header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
    signature = _b64url_encode(_sign(signing_input, settings.JWT_SECRET))
    return f"{header_b64}.{payload_b64}.{signature}"


def decode_token(token: str) -> dict:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Malformed token")
        header_b64, payload_b64, sig_b64 = parts
        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = _b64url_encode(_sign(signing_input, settings.JWT_SECRET))
        if not hmac.compare_digest(sig_b64, expected_sig):
            raise ValueError("Invalid signature")

        payload_raw = _b64url_decode(payload_b64)
        payload = json.loads(payload_raw.decode("utf-8"))
        exp = payload.get("exp")
        if exp is not None:
            now_ts = int(datetime.now(tz=timezone.utc).timestamp())
            if now_ts >= int(exp):
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired")
        return payload
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> UserOut:
    payload = decode_token(token)
    email = payload.get("sub")
    if not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    db_user = get_user_by_email(email)
    if not db_user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    if not db_user.is_confirmed:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User not confirmed")

    return UserOut(id=db_user.id, email=db_user.email, role_id=db_user.role_id, role=db_user.role, is_confirmed=db_user.is_confirmed)


async def require_admin(current_user: UserOut = Depends(get_current_user)) -> UserOut:
    if (current_user.role or "").lower() != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin privileges required")
    return current_user
