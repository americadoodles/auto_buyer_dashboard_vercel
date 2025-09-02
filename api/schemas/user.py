
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID, uuid4


class UserBase(BaseModel):
    email: EmailStr
    role_id: int


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: UUID
    is_confirmed: bool


class UserInDB(UserOut):
    hashed_password: str

class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserSignupRequest(BaseModel):
    id: Optional[UUID] = None
    email: EmailStr
    password: str
    role_id: int

class UserConfirmRequest(BaseModel):
    user_id: UUID
    confirm: bool

class UserRemoveRequest(BaseModel):
    user_id: UUID
