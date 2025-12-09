
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID, uuid4
from datetime import datetime


class UserBase(BaseModel):
    email: EmailStr
    username: str
    role_id: int


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: UUID
    role: str  # Role name (e.g., "admin", "buyer", "analyst")
    is_confirmed: bool
    last_login: Optional[datetime] = None


class UserInDB(UserOut):
    hashed_password: str

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"



class UserSignupRequest(BaseModel):
    id: Optional[UUID] = None
    email: EmailStr
    password: str
    username: str
    role_id: Optional[int] = None
    role_name: Optional[str] = None

class UserConfirmRequest(BaseModel):
    user_id: UUID
    confirm: bool

class UserRemoveRequest(BaseModel):
    user_id: UUID

class UserUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    username: Optional[str] = None
    role_id: Optional[int] = None
    is_confirmed: Optional[bool] = None

class UserUpdatePasswordRequest(BaseModel):
    current_password: str
    new_password: str

class UserResetPasswordRequest(BaseModel):
    """Admin-only: Reset password without current password verification"""
    new_password: str