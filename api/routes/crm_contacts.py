# CRM Contact Management API Routes
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from uuid import UUID
from ..schemas.crm import (
    ContactCreate, ContactUpdate, ContactOut, ContactActivityCreate, ContactActivityOut,
    ContactTypeCreate, ContactTypeOut
)
from ..schemas.user import UserOut
from ..core.auth import get_current_user, require_admin
from ..repositories.crm_contacts import (
    create_contact, get_contact, update_contact, delete_contact, list_contacts,
    create_contact_activity, get_contact_activities,
    create_contact_type, get_contact_types, update_contact_type, delete_contact_type
)
import logging

contact_router = APIRouter(prefix="/crm/contacts", tags=["crm-contacts"])

# ==============================================
# CONTACT MANAGEMENT ENDPOINTS
# ==============================================

@contact_router.post("/", response_model=ContactOut)
def create_new_contact(
    contact: ContactCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new contact"""
    try:
        return create_contact(contact, current_user.id)
    except Exception as e:
        logging.error(f"Error creating contact: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create contact")

@contact_router.get("/", response_model=List[ContactOut])
def get_all_contacts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    contact_type_id: Optional[int] = Query(None),
    assigned_to: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: UserOut = Depends(get_current_user)
):
    """Get all contacts with optional filtering"""
    try:
        return list_contacts(skip=skip, limit=limit, contact_type_id=contact_type_id,
                            assigned_to=assigned_to, search=search, is_active=is_active)
    except Exception as e:
        logging.error(f"Error fetching contacts: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch contacts")

@contact_router.get("/{contact_id}", response_model=ContactOut)
def get_contact_by_id(
    contact_id: UUID,
    current_user: UserOut = Depends(get_current_user)
):
    """Get a specific contact by ID"""
    try:
        contact = get_contact(contact_id)
        if not contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        return contact
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching contact {contact_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch contact")

@contact_router.put("/{contact_id}", response_model=ContactOut)
def update_contact_by_id(
    contact_id: UUID,
    contact_update: ContactUpdate,
    current_user: UserOut = Depends(get_current_user)
):
    """Update a specific contact"""
    try:
        updated_contact = update_contact(contact_id, contact_update)
        if not updated_contact:
            raise HTTPException(status_code=404, detail="Contact not found")
        return updated_contact
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating contact {contact_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update contact")

@contact_router.delete("/{contact_id}")
def delete_contact_by_id(
    contact_id: UUID,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a specific contact (admin only)"""
    try:
        success = delete_contact(contact_id)
        if not success:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"message": "Contact deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting contact {contact_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete contact")

# ==============================================
# CONTACT ACTIVITY ENDPOINTS
# ==============================================

@contact_router.post("/{contact_id}/activities", response_model=ContactActivityOut)
def create_contact_activity(
    contact_id: UUID,
    activity: ContactActivityCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new activity for a contact"""
    try:
        activity.contact_id = contact_id
        return create_contact_activity(activity, current_user.id)
    except Exception as e:
        logging.error(f"Error creating contact activity: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create contact activity")

@contact_router.get("/{contact_id}/activities", response_model=List[ContactActivityOut])
def get_contact_activities_list(
    contact_id: UUID,
    current_user: UserOut = Depends(get_current_user)
):
    """Get all activities for a specific contact"""
    try:
        return get_contact_activities(contact_id)
    except Exception as e:
        logging.error(f"Error fetching contact activities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch contact activities")

# ==============================================
# CONTACT TYPE MANAGEMENT ENDPOINTS
# ==============================================

@contact_router.post("/types", response_model=ContactTypeOut)
def create_contact_type_endpoint(
    contact_type: ContactTypeCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Create a new contact type (admin only)"""
    try:
        return create_contact_type(contact_type)
    except Exception as e:
        logging.error(f"Error creating contact type: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create contact type")

@contact_router.get("/types", response_model=List[ContactTypeOut])
def get_contact_types_list(
    current_user: UserOut = Depends(get_current_user)
):
    """Get all contact types"""
    try:
        return get_contact_types()
    except Exception as e:
        logging.error(f"Error fetching contact types: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch contact types")

@contact_router.put("/types/{type_id}", response_model=ContactTypeOut)
def update_contact_type_endpoint(
    type_id: int,
    contact_type: ContactTypeCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Update a contact type (admin only)"""
    try:
        updated_type = update_contact_type(type_id, contact_type)
        if not updated_type:
            raise HTTPException(status_code=404, detail="Contact type not found")
        return updated_type
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating contact type: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update contact type")

@contact_router.delete("/types/{type_id}")
def delete_contact_type_endpoint(
    type_id: int,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a contact type (admin only)"""
    try:
        success = delete_contact_type(type_id)
        if not success:
            raise HTTPException(status_code=404, detail="Contact type not found")
        return {"message": "Contact type deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting contact type: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete contact type")
