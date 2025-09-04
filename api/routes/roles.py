from fastapi import APIRouter, HTTPException, Depends
from ..schemas.role import RoleOut, RoleCreate, RoleEdit
from ..schemas.user import UserOut
from ..repositories.roles import list_roles, add_role, edit_role, delete_role
from ..core.auth import require_admin

role_router = APIRouter(prefix="/roles", tags=["roles"])

@role_router.get("", include_in_schema=False, response_model=list[RoleOut])  # /api/roles
@role_router.get("/", response_model=list[RoleOut])  # /api/roles/
def get_roles(_: UserOut = Depends(require_admin)):
    return list_roles()

@role_router.post("", include_in_schema=False, response_model=RoleOut)  # /api/roles
@role_router.post("/", response_model=RoleOut)  # /api/roles/
def create_role(role: RoleCreate, _: UserOut = Depends(require_admin)):
    return add_role(role.name, role.description)

@role_router.put("", include_in_schema=False, response_model=bool)  # /api/roles
@role_router.put("/", response_model=bool)  # /api/roles/
def update_role(role: RoleEdit, _: UserOut = Depends(require_admin)):
    success = edit_role(role.id, role.name, role.description)
    if not success:
        raise HTTPException(status_code=400, detail="Could not update role.")
    return success

@role_router.delete("/{role_id}", response_model=bool)
def remove_role(role_id: int, _: UserOut = Depends(require_admin)):
    success = delete_role(role_id)
    if not success:
        raise HTTPException(status_code=400, detail="Could not delete role.")
    return success
