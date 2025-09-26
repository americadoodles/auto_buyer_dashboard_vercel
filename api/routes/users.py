from ..repositories.roles import get_role_by_name
from fastapi import APIRouter, HTTPException, Depends
from ..schemas.user import UserOut, UserSignupRequest, UserConfirmRequest, UserRemoveRequest, UserLoginRequest, TokenResponse, UserUpdateRequest, UserUpdatePasswordRequest
from ..repositories.users import (
    create_user,
    get_user_by_email,
    add_signup_request,
    list_signup_requests,
    confirm_user_signup,
    remove_user,
    list_users,
    update_user,
    update_user_password,
    get_user_by_id
)
import logging
from ..core.auth import create_access_token, get_current_user, require_admin

user_router = APIRouter(prefix="/users", tags=["users"])

@user_router.get("", include_in_schema=False, response_model=list[UserOut])  # /api/users
@user_router.get("/", response_model=list[UserOut])  # /api/users/
def get_users(_: UserOut = Depends(require_admin)):
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
        if request.role_id is not None and request.role_id != buyer_role_id:
            raise HTTPException(status_code=403, detail="Only buyers can signup.")
        
        from uuid import uuid4
        signup_id = uuid4()
        
        # Try to add signup request, returns False if email exists
        # Ensure role_id defaults to buyer if not provided
        desired_role_id = request.role_id if request.role_id is not None else buyer_role_id
        success = add_signup_request(UserSignupRequest(email=request.email, username=request.username, password=request.password, role_id=desired_role_id))
        if not success:
            raise HTTPException(status_code=400, detail="Email already exists.")
        
        # Get role name from database
        role_name = buyer_role.name if buyer_role else "buyer"
        return UserOut(
            id=signup_id,
            email=request.email,
            username=request.username,
            role_id=desired_role_id,
            role=role_name,
            is_confirmed=False
        )
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logging.error(f"Unexpected error during signup: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during signup. Please try again later.")

@user_router.post("/login", response_model=TokenResponse)
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
        user_out = UserOut(id=db_user.id, email=db_user.email, username=db_user.username, role_id=db_user.role_id, role=db_user.role, is_confirmed=db_user.is_confirmed)
        token = create_access_token({"sub": db_user.email, "uid": str(db_user.id), "role": db_user.role})
        return TokenResponse(access_token=token, user=user_out)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Unexpected error during login: {str(e)}")
        raise HTTPException(status_code=500, detail="Internal server error during login. Please try again later.")

@user_router.get("/signup-requests", response_model=list[UserSignupRequest])
def get_signup_requests(_: UserOut = Depends(require_admin)):
    return list_signup_requests()

@user_router.post("/confirm-signup")
def confirm_signup(request: UserConfirmRequest, _: UserOut = Depends(require_admin)):
    success = confirm_user_signup(request)
    if not success:
        raise HTTPException(status_code=400, detail="Could not confirm user.")
    return {"ok": True}

@user_router.post("/remove-user")
def remove_user_api(request: UserRemoveRequest, _: UserOut = Depends(require_admin)):
    success = remove_user(request)
    if not success:
        raise HTTPException(status_code=400, detail="Could not remove user.")
    return {"ok": True}


@user_router.get("/me", response_model=UserOut)
def me(current_user: UserOut = Depends(get_current_user)):
    return current_user

@user_router.get("/{user_id}", response_model=UserOut)
def get_user(user_id: str, _: UserOut = Depends(require_admin)):
    from uuid import UUID
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    user = get_user_by_id(user_uuid)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@user_router.put("/{user_id}", response_model=UserOut)
def update_user_api(user_id: str, request: UserUpdateRequest, _: UserOut = Depends(require_admin)):
    from uuid import UUID
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    # Check if user exists
    existing_user = get_user_by_id(user_uuid)
    if not existing_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert request to dict, excluding None values
    update_data = {}
    if request.email is not None:
        update_data['email'] = request.email
    if request.username is not None:
        update_data['username'] = request.username
    if request.role_id is not None:
        update_data['role_id'] = request.role_id
    if request.is_confirmed is not None:
        update_data['is_confirmed'] = request.is_confirmed
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updated_user = update_user(user_uuid, update_data)
    if not updated_user:
        raise HTTPException(status_code=500, detail="Failed to update user")
    
    return updated_user

@user_router.put("/{user_id}/password")
def update_user_password_api(user_id: str, request: UserUpdatePasswordRequest, _: UserOut = Depends(require_admin)):
    from uuid import UUID
    try:
        user_uuid = UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid user ID format")
    
    success = update_user_password(user_uuid, request.current_password, request.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update password. Check current password.")
    
    return {"ok": True}

@user_router.put("/me", response_model=UserOut)
def update_my_profile(request: UserUpdateRequest, current_user: UserOut = Depends(get_current_user)):
    # Users can only update their own email and username, not role or confirmation status
    update_data = {}
    if request.email is not None:
        update_data['email'] = request.email
    if request.username is not None:
        update_data['username'] = request.username
    
    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")
    
    updated_user = update_user(current_user.id, update_data)
    if not updated_user:
        raise HTTPException(status_code=500, detail="Failed to update profile")
    
    return updated_user

@user_router.put("/me/password")
def update_my_password(request: UserUpdatePasswordRequest, current_user: UserOut = Depends(get_current_user)):
    success = update_user_password(current_user.id, request.current_password, request.new_password)
    if not success:
        raise HTTPException(status_code=400, detail="Failed to update password. Check current password.")
    
    return {"ok": True}
