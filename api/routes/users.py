from fastapi import APIRouter, HTTPException, Depends
from ..schemas.user import UserOut, UserSignupRequest, UserConfirmRequest, UserRemoveRequest, UserLoginRequest
from ..repositories.users import create_user, get_user_by_email, add_signup_request, list_signup_requests, confirm_user_signup, remove_user

user_router = APIRouter(prefix="/users", tags=["users"])

@user_router.post("/signup", response_model=UserOut)
def signup(request: UserSignupRequest):
    # Only buyers can signup
    if request.role != "buyer":
        raise HTTPException(status_code=403, detail="Only buyers can signup.")
    from uuid import uuid4
    signup_id = uuid4()
    # Try to add signup request, returns False if email exists
    success = add_signup_request(UserSignupRequest(email=request.email, password=request.password, role=request.role))
    if not success:
        raise HTTPException(status_code=400, detail="Email already exists.")
    return {"email": request.email, "role": request.role, "is_confirmed": False, "id": signup_id}

@user_router.post("/login", response_model=UserOut)
def login(request: UserLoginRequest):
    db_user = get_user_by_email(request.email)
    if not db_user or not db_user.is_confirmed:
        raise HTTPException(status_code=401, detail="Invalid credentials or not confirmed.")
    from ..repositories.users import verify_password
    if not verify_password(request.password, db_user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials.")
    return UserOut(id=db_user.id, email=db_user.email, role=db_user.role, is_confirmed=db_user.is_confirmed)

@user_router.get("/signup-requests", response_model=list[UserSignupRequest])
def get_signup_requests():
    return list_signup_requests()

@user_router.post("/confirm-signup")
def confirm_signup(request: UserConfirmRequest):
    success = confirm_user_signup(request)
    if not success:
        raise HTTPException(status_code=400, detail="Could not confirm user.")
    return {"ok": True}

@user_router.post("/remove-user")
def remove_user_api(request: UserRemoveRequest):
    success = remove_user(request)
    if not success:
        raise HTTPException(status_code=400, detail="Could not remove user.")
    return {"ok": True}
