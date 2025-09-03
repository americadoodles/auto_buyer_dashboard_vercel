from typing import Optional
from pydantic import BaseModel

class RoleOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None

class RoleEdit(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
