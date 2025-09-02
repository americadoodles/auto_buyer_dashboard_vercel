from ..repositories.roles import get_role_by_name
from fastapi import APIRouter, HTTPException, Depends
from ..schemas.user import UserOut, UserSignupRequest, UserConfirmRequest, UserRemoveRequest, UserLoginRequest
from ..repositories.users import (
    create_user,
    get_user_by_email,
    add_signup_request,
    list_signup_requests,
    confirm_user_signup,
    remove_user,
    list_users
)
import logging

user_router = APIRouter(prefix="/users", tags=["users"])

@user_router.get("/", response_model=list[UserOut])
def get_users():
    return list_users()

@user_router.post("/signup", response_model=UserOut)
def signup(request: UserSignupRequest):
    try:
        # Only buyers can signup
        buyer_role = get_role_by_name("buyer")
        if not buyer_role:
            logging.error("Buyer role not found in database")
            raise HTTPException(status_code=500, detail="System configuration error: buyer role not found. Please contact administrator.")
        
        buyer_role_id = buyer_role.id
        if request.role_id != buyer_role_id:
            raise HTTPException(status_code=403, detail="Only buyers can signup.")
        
        from uuid import uuid4
        signup_id = uuid4()
        
        # Try to add signup request, returns False if email exists
        success = add_signup_request(UserSignupRequest(email=request.email, password=request.password, role_id=request.role_id))
        if not success:
            raise HTTPException(status_code=400, detail="Email already exists.")
        
        # Return proper UserOut response with role name
        return UserOut(
            id=signup_id,
            email=request.email, 
            role_id=request.role_id,
            role="buyer",  # We know it's a buyer role
            is_confirmed=False
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logging.error(f"Unexpected error during signup: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during signup. Please try again later.")

@user_router.post("/login", response_model=UserOut)
def login(request: UserLoginRequest):
    try:
        db_user = get_user_by_email(request.email)
        if not db_user or not db_user.is_confirmed:
            raise HTTPException(status_code=401, detail="Invalid credentials or not confirmed.")
        from ..repositories.users import verify_password
        import logging
        logging.info(f"Verifying password for {request.email}: request.password={request.password}, hashed_password={db_user.hashed_password}")
        password_check = verify_password(request.password, db_user.hashed_password)
        logging.info(f"verify_password returned: {password_check}")
        if not password_check:
            raise HTTPException(status_code=401, detail="Invalid credentials.")
        return UserOut(id=db_user.id, email=db_user.email, role_id=db_user.role_id, role=db_user.role, is_confirmed=db_user.is_confirmed)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error during login: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during login. Please try again later.")

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
