# CRM Pydantic Schemas for Auto-Buyer Platform
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any, Literal, Union
from datetime import datetime, date
from uuid import UUID
from decimal import Decimal
from enum import Enum

# ==============================================
# LEAD MANAGEMENT SCHEMAS
# ==============================================

class LeadSourceBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class LeadSourceCreate(LeadSourceBase):
    pass

class LeadSourceOut(LeadSourceBase):
    id: int
    created_at: datetime

class LeadStatusBase(BaseModel):
    name: str
    description: Optional[str] = None
    color_code: str = "#3B82F6"
    is_active: bool = True
    sort_order: int = 0

class LeadStatusCreate(LeadStatusBase):
    pass

class LeadStatusOut(LeadStatusBase):
    id: int
    created_at: datetime

class LeadBase(BaseModel):
    listing_id: Optional[int] = None
    contact_id: Optional[UUID] = None
    status_id: Optional[int] = None
    source_id: Optional[int] = None
    assigned_to: Optional[UUID] = None
    vehicle_interest: Optional[Dict[str, Any]] = None
    budget_range: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    lead_score: int = Field(default=0, ge=0, le=100)

class LeadCreate(LeadBase):
    pass

class LeadUpdate(BaseModel):
    listing_id: Optional[int] = None
    contact_id: Optional[UUID] = None
    status_id: Optional[int] = None
    source_id: Optional[int] = None
    assigned_to: Optional[UUID] = None
    vehicle_interest: Optional[Dict[str, Any]] = None
    budget_range: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    lead_score: Optional[int] = Field(None, ge=0, le=100)

class LeadOut(LeadBase):
    id: UUID
    qualified_at: Optional[datetime] = None
    converted_at: Optional[datetime] = None
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    # Nested objects (populated from joins)
    listing: Optional[Any] = None  # Will be ListingOut
    contact: Optional['ContactOut'] = None
    status: Optional['LeadStatusOut'] = None
    source: Optional['LeadSourceOut'] = None
    assigned_to_user: Optional[Any] = None  # Will be UserOut
    created_by_user: Optional[Any] = None  # Will be UserOut

class LeadActivityBase(BaseModel):
    activity_type: str  # 'call', 'email', 'meeting', 'note'
    subject: Optional[str] = None
    description: Optional[str] = None
    activity_date: Optional[datetime] = None

class LeadActivityCreate(LeadActivityBase):
    lead_id: UUID

class LeadActivityOut(LeadActivityBase):
    id: UUID
    lead_id: UUID
    created_by: UUID
    created_at: datetime

# ==============================================
# CONTACT MANAGEMENT SCHEMAS
# ==============================================

class ContactTypeBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class ContactTypeCreate(ContactTypeBase):
    pass

class ContactTypeOut(ContactTypeBase):
    id: int
    created_at: datetime

class ContactBase(BaseModel):
    first_name: str
    last_name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    contact_type_id: Optional[int] = None
    assigned_to: Optional[UUID] = None
    address: Optional[Dict[str, Any]] = None
    social_profiles: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    is_active: bool = True

class ContactCreate(ContactBase):
    pass

class ContactUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    mobile: Optional[str] = None
    company: Optional[str] = None
    job_title: Optional[str] = None
    contact_type_id: Optional[int] = None
    assigned_to: Optional[UUID] = None
    address: Optional[Dict[str, Any]] = None
    social_profiles: Optional[Dict[str, Any]] = None
    preferences: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ContactOut(ContactBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

class ContactActivityBase(BaseModel):
    activity_type: str
    subject: Optional[str] = None
    description: Optional[str] = None
    activity_date: Optional[datetime] = None

class ContactActivityCreate(ContactActivityBase):
    contact_id: UUID

class ContactActivityOut(ContactActivityBase):
    id: UUID
    contact_id: UUID
    created_by: UUID
    created_at: datetime

# ==============================================
# DEAL MANAGEMENT SCHEMAS
# ==============================================

class DealStageBase(BaseModel):
    name: str
    description: Optional[str] = None
    probability: int = Field(default=0, ge=0, le=100)
    color_code: str = "#3B82F6"
    is_active: bool = True
    sort_order: int = 0

class DealStageCreate(DealStageBase):
    pass

class DealStageOut(DealStageBase):
    id: int
    created_at: datetime

class DealCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class DealCategoryCreate(DealCategoryBase):
    pass

class DealCategoryOut(DealCategoryBase):
    id: int
    created_at: datetime

class DealBase(BaseModel):
    title: str  # Frontend uses 'title', maps to 'name' in database
    description: Optional[str] = None
    contact_id: Optional[UUID] = None
    lead_id: Optional[UUID] = None
    assigned_to: Optional[Union[UUID, 'UserBasic']] = None  # Can be UUID or nested UserBasic object
    deal_stage_id: Optional[int] = None
    deal_category_id: Optional[int] = None
    expected_close_date: Optional[date] = None
    actual_close_date: Optional[date] = None
    deal_value: Optional[Decimal] = None
    probability: int = Field(default=0, ge=0, le=100)
    vehicle_requirements: Optional[Dict[str, Any]] = None
    financing_requirements: Optional[Dict[str, Any]] = None
    trade_in_info: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    is_active: bool = True
    is_won: bool = False
    is_lost: bool = False
    lost_reason: Optional[str] = None

class DealCreate(DealBase):
    pass

class DealUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    contact_id: Optional[UUID] = None
    lead_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    deal_stage_id: Optional[int] = None
    deal_category_id: Optional[int] = None
    expected_close_date: Optional[date] = None
    actual_close_date: Optional[date] = None
    deal_value: Optional[Decimal] = None
    probability: Optional[int] = Field(None, ge=0, le=100)
    vehicle_requirements: Optional[Dict[str, Any]] = None
    financing_requirements: Optional[Dict[str, Any]] = None
    trade_in_info: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None
    is_won: Optional[bool] = None
    is_lost: Optional[bool] = None
    lost_reason: Optional[str] = None

class ContactBasic(BaseModel):
    id: UUID
    first_name: str
    last_name: str

class UserBasic(BaseModel):
    id: UUID
    username: str
    
    class Config:
        from_attributes = True
        # Ensure proper JSON serialization
        json_encoders = {
            UUID: str
        }

class DealOut(DealBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime
    contact: Optional[ContactBasic] = None
    deal_category: Optional[DealCategoryOut] = None
    # assigned_to inherited from DealBase as Union[UUID, UserBasic]
    # Override to ensure proper serialization
    model_config = {"from_attributes": True}

class DealActivityBase(BaseModel):
    activity_type: str
    subject: Optional[str] = None
    description: Optional[str] = None
    activity_date: Optional[datetime] = None

class DealActivityCreate(DealActivityBase):
    deal_id: UUID

class DealActivityOut(DealActivityBase):
    id: UUID
    deal_id: UUID
    created_by: UUID
    created_at: datetime

# ==============================================
# TASK MANAGEMENT SCHEMAS (Kanban Structure)
# ==============================================

class TaskPriority(str, Enum):
    HIGH = "High"
    MEDIUM = "Medium"
    LOW = "Low"

class TaskStatus(str, Enum):
    OPEN = "Open"
    IN_PROGRESS = "InProgress"
    DONE = "Done"
    SNOOZED = "Snoozed"

class TaskBoardScope(str, Enum):
    GLOBAL = "global"
    TEAM = "team"
    MY = "my"

# Task Priority Schemas (Lookup Table)
class TaskPriorityBase(BaseModel):
    name: str
    description: Optional[str] = None
    color_code: str = "#3B82F6"
    is_active: bool = True
    sort_order: int

class TaskPriorityCreate(TaskPriorityBase):
    pass

class TaskPriorityOut(TaskPriorityBase):
    id: int
    created_at: datetime

# Task Status Schemas (Lookup Table)
class TaskStatusBase(BaseModel):
    name: str
    description: Optional[str] = None
    color_code: str = "#3B82F6"
    is_active: bool = True
    sort_order: int = 0

class TaskStatusCreate(TaskStatusBase):
    pass

class TaskStatusOut(TaskStatusBase):
    id: int
    created_at: datetime

# Task Board Schemas
class TaskBoardBase(BaseModel):
    name: str
    scope: TaskBoardScope

class TaskBoardCreate(TaskBoardBase):
    pass

class TaskBoardUpdate(BaseModel):
    name: Optional[str] = None
    scope: Optional[TaskBoardScope] = None

class TaskBoardOut(TaskBoardBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

# Task Column Schemas
class TaskColumnBase(BaseModel):
    board_id: UUID
    name: str
    wip_limit: Optional[int] = None
    position: int = 0

class TaskColumnCreate(TaskColumnBase):
    pass

class TaskColumnUpdate(BaseModel):
    name: Optional[str] = None
    wip_limit: Optional[int] = None
    position: Optional[int] = None

class TaskColumnOut(TaskColumnBase):
    id: UUID
    created_at: datetime
    updated_at: datetime

# Task Schemas
class TaskBase(BaseModel):
    related_type: Optional[str] = None  # 'lead', 'contact', 'deal', etc.
    related_id: Optional[UUID] = None
    title: str
    description: Optional[str] = None
    priority_id: Optional[int] = None
    status_id: Optional[int] = None
    column_id: Optional[UUID] = None
    owner_user_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    due_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    related_lead_id: Optional[UUID] = None
    related_contact_id: Optional[UUID] = None
    related_deal_id: Optional[UUID] = None

class TaskCreate(TaskBase):
    pass

class TaskUpdate(BaseModel):
    related_type: Optional[str] = None
    related_id: Optional[UUID] = None
    title: Optional[str] = None
    description: Optional[str] = None
    priority_id: Optional[int] = None
    status_id: Optional[int] = None
    column_id: Optional[UUID] = None
    owner_user_id: Optional[UUID] = None
    assigned_to: Optional[UUID] = None
    due_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    related_lead_id: Optional[UUID] = None
    related_contact_id: Optional[UUID] = None
    related_deal_id: Optional[UUID] = None

class TaskOut(TaskBase):
    id: UUID
    priority: Optional[TaskPriority] = None  # For backward compatibility
    status: Optional[TaskStatus] = None  # For backward compatibility
    priority_name: Optional[str] = None
    status_name: Optional[str] = None
    assigned_to_user: Optional[str] = None  # Username of assigned user
    owner_user_name: Optional[str] = None  # Username of owner user
    related_deal_name: Optional[str] = None  # Deal name if related to a deal
    contact_id: Optional[UUID] = None  # Contact ID from related deal
    created_at: datetime
    updated_at: datetime

# Task Activity Schemas
class TaskActivityBase(BaseModel):
    task_id: UUID
    type: str  # 'created', 'updated', 'moved', 'assigned', 'commented', etc.
    payload_json: Optional[dict] = None
    user_id: Optional[UUID] = None

class TaskActivityCreate(TaskActivityBase):
    pass

class TaskActivityOut(TaskActivityBase):
    id: UUID
    at: datetime

# Task Move Schema
class TaskMoveRequest(BaseModel):
    column_id: UUID
    admin_override: bool = False  # Allow admin to override WIP limits

# Task Board Detail Schema (with columns and counts)
class TaskColumnWithCount(TaskColumnOut):
    task_count: int

class TaskBoardDetailOut(BaseModel):
    id: UUID
    name: str
    scope: TaskBoardScope
    created_at: datetime
    updated_at: datetime
    columns: List[TaskColumnWithCount]

# Bulk Operation Schemas
class BulkTaskMoveRequest(BaseModel):
    task_ids: List[UUID]
    column_id: UUID
    admin_override: bool = False

class BulkTaskOwnerChangeRequest(BaseModel):
    task_ids: List[UUID]
    owner_user_id: UUID

class BulkTaskStatusCloseRequest(BaseModel):
    task_ids: List[UUID]

# ==============================================
# COMMUNICATION SCHEMAS
# ==============================================

class EmailTemplateBase(BaseModel):
    name: str
    subject: str
    body: str
    template_type: str  # 'lead_followup', 'deal_reminder', 'welcome'
    is_active: bool = True

class EmailTemplateCreate(EmailTemplateBase):
    pass

class EmailTemplateUpdate(BaseModel):
    name: Optional[str] = None
    subject: Optional[str] = None
    body: Optional[str] = None
    template_type: Optional[str] = None
    is_active: Optional[bool] = None

class EmailTemplateOut(EmailTemplateBase):
    id: UUID
    created_by: UUID
    created_at: datetime
    updated_at: datetime

class CommunicationBase(BaseModel):
    to_contact_id: Optional[UUID] = None
    to_lead_id: Optional[UUID] = None
    communication_type: str  # 'email', 'call', 'sms', 'meeting'
    subject: Optional[str] = None
    content: Optional[str] = None
    direction: str  # 'inbound', 'outbound'
    status: str = "sent"  # 'sent', 'delivered', 'read', 'failed'
    template_id: Optional[UUID] = None

class CommunicationCreate(CommunicationBase):
    pass

class CommunicationOut(CommunicationBase):
    id: UUID
    from_user_id: UUID
    created_at: datetime

# ==============================================
# ANALYTICS & REPORTING SCHEMAS
# ==============================================

class KPIDefinitionBase(BaseModel):
    name: str
    description: Optional[str] = None
    calculation_method: str
    target_value: Optional[Decimal] = None
    unit: str  # 'count', 'percentage', 'currency'
    is_active: bool = True

class KPIDefinitionCreate(KPIDefinitionBase):
    pass

class KPIDefinitionOut(KPIDefinitionBase):
    id: int
    created_at: datetime

class KPIMeasurementBase(BaseModel):
    kpi_id: int
    user_id: Optional[UUID] = None
    measurement_date: date
    value: Decimal

class KPIMeasurementCreate(KPIMeasurementBase):
    pass

class KPIMeasurementOut(KPIMeasurementBase):
    id: UUID
    created_at: datetime

# ==============================================
# DASHBOARD & SUMMARY SCHEMAS
# ==============================================

class LeadSummary(BaseModel):
    id: UUID
    listing_id: Optional[int] = None
    contact_id: Optional[UUID] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    status_name: Optional[str] = None
    status_color: Optional[str] = None
    source_name: Optional[str] = None
    assigned_to_name: Optional[str] = None
    vehicle_interest: Optional[Dict[str, Any]] = None
    budget_range: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None
    lead_score: int
    qualified_at: Optional[datetime] = None
    converted_at: Optional[datetime] = None

class DealPipeline(BaseModel):
    stage_id: int
    stage_name: str
    color_code: str
    deal_count: int
    total_value: Decimal
    avg_probability: float

class TaskDashboard(BaseModel):
    id: UUID
    title: str
    due_date: Optional[datetime] = None
    priority_name: Optional[str] = None
    status_name: Optional[str] = None
    owner_user_name: Optional[str] = None
    column_name: Optional[str] = None
    board_name: Optional[str] = None
    created_at: datetime

class CRMStats(BaseModel):
    total_leads: int
    total_contacts: int
    active_deals: int
    won_deals: int
    lost_deals: int
    total_revenue: Decimal
    pending_tasks: int
    overdue_tasks: int

class LeadConversionMetrics(BaseModel):
    total_leads: int
    converted_leads: int
    conversion_rate: float
    avg_score: Optional[float] = None

class SalesPerformanceMetrics(BaseModel):
    deals_created: int
    deals_won: int
    deals_lost: int
    win_rate: float
    total_revenue: Decimal
    avg_deal_size: Decimal
    avg_sales_cycle: Optional[float] = None
    revenue_by_stage: Dict[str, Decimal]
