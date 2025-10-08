from typing import Optional, List
from pydantic import BaseModel

class SlackLeadData(BaseModel):
    """Schema for Slack lead notification data matching the new_leads template"""
    lead_source: str
    vehicle_type: str
    vehicle_year_make_model: str
    mileage: int
    condition: str = "Unknown"
    estimated_price_offer: float
    urgency_level: str = "Medium"
    main_contact: str
    vin: str
    clear_carfax: str = "Unknown"
    clean_autocheck: str = "Unknown"
    mmr_price: Optional[float] = None
    distance: Optional[str] = None
    image_url: Optional[str] = None

class SlackNotificationRequest(BaseModel):
    """Request schema for sending Slack notifications"""
    vehicle_key: str
    vin: str
    channel: Optional[str] = None
    custom_message: Optional[str] = None

class SlackNotificationResponse(BaseModel):
    """Response schema for Slack notifications"""
    vehicle_key: str
    vin: str
    sent: bool
    channel: str
    message: str
    error: Optional[str] = None

class SlackWorkflowTriggerRequest(BaseModel):
    """Request schema for triggering Slack workflows"""
    vehicle_key: str
    vin: str
    custom_message: Optional[str] = None
    workflow_step_id: Optional[str] = None

class SlackWorkflowTriggerResponse(BaseModel):
    """Response schema for Slack workflow triggers"""
    vehicle_key: str
    vin: str
    triggered: bool
    workflow_id: Optional[str] = None
    message: str
    error: Optional[str] = None

class SlackWorkflowFormData(BaseModel):
    """Schema for workflow form data auto-population"""
    lead_source: str
    vehicle_type: str
    vehicle_year_make_model: str
    mileage: int
    condition: str
    estimated_price_offer: float
    urgency_level: str
    main_contact: str
    vin: str
    clear_carfax: str = "Unknown"
    clean_autocheck: str = "Unknown"
    mmr_price: Optional[float] = None
    distance: Optional[str] = None
    image_url: Optional[str] = None
    vehicle_key: str
    listing_id: str
    score: int
    dom: int
    radius: int
    status: str
    custom_notes: Optional[str] = None