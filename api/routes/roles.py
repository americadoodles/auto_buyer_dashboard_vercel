from fastapi import APIRouter, HTTPException, Depends
from ..schemas.role import RoleOut, RoleCreate, RoleEdit
from ..repositories.roles import list_roles, add_role, edit_role, delete_role
from ..core.auth import require_admin

role_router = APIRouter(prefix="/roles", tags=["roles"])

@role_router.get("/", response_model=list[RoleOut])
def get_roles(_: "UserOut" = Depends(require_admin)):
    return list_roles()

@role_router.post("/", response_model=RoleOut)
def create_role(role: RoleCreate, _: "UserOut" = Depends(require_admin)):
    return add_role(role.name, role.description)

@role_router.put("/", response_model=bool)
def update_role(role: RoleEdit, _: "UserOut" = Depends(require_admin)):
    success = edit_role(role.id, role.name, role.description)
    if not success:
        raise HTTPException(status_code=400, detail="Could not update role.")
    return success

@role_router.delete("/{role_id}", response_model=bool)
def remove_role(role_id: int, _: "UserOut" = Depends(require_admin)):
    success = delete_role(role_id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete role.")
    return success
