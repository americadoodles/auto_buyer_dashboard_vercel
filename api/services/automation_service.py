# Automation Service for CRM Task Automation Rules
import logging
from typing import Optional
from uuid import UUID
from datetime import datetime, timedelta
from ..repositories.crm_tasks import create_task, list_tasks, complete_task, update_task
from ..repositories.crm_leads import get_lead
from ..repositories.crm_deals import get_deal
from ..repositories.crm_contacts import get_contact
from ..schemas.crm import TaskCreate, TaskPriority, TaskStatus
from ..schemas.events import EventType
from ..core.db_helpers import get_db_connection

logger = logging.getLogger(__name__)


class AutomationService:
    """Service for handling automation rules based on events"""
    
    def __init__(self):
        self.event_bus = None  # Will be set by dependency injection
    
    def handle_lead_created(self, payload: dict):
        """Handle LeadCreated event: Create 'First contact seller' task"""
        try:
            lead_id = UUID(payload["lead_id"])
            assigned_to = UUID(payload["assigned_to"]) if payload.get("assigned_to") else None
            
            if not assigned_to:
                logger.warning(f"No assigned_to for lead {lead_id}, skipping task creation")
                return
            
            # Get the lead to find the column_id (Inbox column)
            lead = get_lead(lead_id)
            if not lead:
                logger.error(f"Lead {lead_id} not found")
                return
            
            # Find Inbox column - we need to query for it
            inbox_column_id = self._get_inbox_column_id()
            if not inbox_column_id:
                logger.warning("Inbox column not found, skipping task creation")
                return
            
            # Create task: "First contact seller" (column=Inbox, due=+2h, owner=lead.owner)
            due_at = datetime.now() + timedelta(hours=2)
            
            task_data = TaskCreate(
                related_type="lead",
                related_id=lead_id,
                title="First contact seller",
                description=f"Initial contact task for lead {lead_id}",
                priority=TaskPriority.MEDIUM,
                status=TaskStatus.OPEN,
                column_id=inbox_column_id,
                owner_user_id=assigned_to,
                due_at=due_at
            )
            
            task = create_task(task_data, assigned_to)
            logger.info(f"Created 'First contact seller' task {task.id} for lead {lead_id}")
            
        except Exception as e:
            logger.error(f"Error handling LeadCreated event: {str(e)}")
            raise
    
    def handle_communication_logged(self, payload: dict):
        """Handle CommunicationLogged event"""
        try:
            direction = payload.get("direction")
            to_lead_id = UUID(payload["to_lead_id"]) if payload.get("to_lead_id") else None
            
            if direction == "outbound":
                self._handle_outbound_communication(payload)
            elif direction == "inbound":
                self._handle_inbound_communication(payload)
                
        except Exception as e:
            logger.error(f"Error handling CommunicationLogged event: {str(e)}")
            raise
    
    def _handle_outbound_communication(self, payload: dict):
        """Handle outbound communication: Mark 'First contact seller' as Done; create 'Follow-up in 24h'"""
        try:
            to_lead_id = UUID(payload["to_lead_id"]) if payload.get("to_lead_id") else None
            if not to_lead_id:
                return
            
            # Find and complete "First contact seller" task
            tasks = list_tasks(
                related_type="lead",
                related_id=to_lead_id,
                search="First contact seller"
            )
            
            for task in tasks:
                if "First contact seller" in task.title:
                    complete_task(task.id, task.owner_user_id or UUID("00000000-0000-0000-0000-000000000000"))
                    logger.info(f"Completed 'First contact seller' task {task.id}")
            
            # Create "Follow-up in 24h" task
            lead = get_lead(to_lead_id)
            if lead and lead.assigned_to:
                inbox_column_id = self._get_inbox_column_id()
                if inbox_column_id:
                    due_at = datetime.now() + timedelta(hours=24)
                    
                    task_data = TaskCreate(
                        related_type="lead",
                        related_id=to_lead_id,
                        title="Follow-up in 24h",
                        description=f"Follow-up task for lead {to_lead_id}",
                        priority=TaskPriority.MEDIUM,
                        status=TaskStatus.OPEN,
                        column_id=inbox_column_id,
                        owner_user_id=lead.assigned_to,
                        due_at=due_at
                    )
                    
                    task = create_task(task_data, lead.assigned_to)
                    logger.info(f"Created 'Follow-up in 24h' task {task.id} for lead {to_lead_id}")
                    
        except Exception as e:
            logger.error(f"Error handling outbound communication: {str(e)}")
            raise
    
    def _handle_inbound_communication(self, payload: dict):
        """Handle inbound communication: Create 'Reply to seller' (due=+2h)"""
        try:
            to_lead_id = UUID(payload["to_lead_id"]) if payload.get("to_lead_id") else None
            if not to_lead_id:
                return
            
            lead = get_lead(to_lead_id)
            if not lead or not lead.assigned_to:
                return
            
            inbox_column_id = self._get_inbox_column_id()
            if not inbox_column_id:
                return
            
            # Create task: "Reply to seller" (due=+2h)
            due_at = datetime.now() + timedelta(hours=2)
            
            task_data = TaskCreate(
                related_type="lead",
                related_id=to_lead_id,
                title="Reply to seller",
                description=f"Reply task for inbound communication on lead {to_lead_id}",
                priority=TaskPriority.HIGH,
                status=TaskStatus.OPEN,
                column_id=inbox_column_id,
                owner_user_id=lead.assigned_to,
                due_at=due_at
            )
            
            task = create_task(task_data, lead.assigned_to)
            logger.info(f"Created 'Reply to seller' task {task.id} for lead {to_lead_id}")
            
        except Exception as e:
            logger.error(f"Error handling inbound communication: {str(e)}")
            raise
    
    def handle_deal_created(self, payload: dict):
        """Handle DealCreated event: Create 'Prepare offer package' (column=Negotiation)"""
        try:
            deal_id = UUID(payload["deal_id"])
            assigned_to = UUID(payload["assigned_to"]) if payload.get("assigned_to") else None
            
            if not assigned_to:
                logger.warning(f"No assigned_to for deal {deal_id}, skipping task creation")
                return
            
            # Find Negotiation column
            negotiation_column_id = self._get_negotiation_column_id()
            if not negotiation_column_id:
                logger.warning("Negotiation column not found, skipping task creation")
                return
            
            # Create task: "Prepare offer package" (column=Negotiation)
            task_data = TaskCreate(
                related_type="deal",
                related_id=deal_id,
                title="Prepare offer package",
                description=f"Prepare offer package for deal {deal_id}",
                priority=TaskPriority.HIGH,
                status=TaskStatus.OPEN,
                column_id=negotiation_column_id,
                owner_user_id=assigned_to,
                due_at=None  # No specific due date
            )
            
            task = create_task(task_data, assigned_to)
            logger.info(f"Created 'Prepare offer package' task {task.id} for deal {deal_id}")
            
        except Exception as e:
            logger.error(f"Error handling DealCreated event: {str(e)}")
            raise
    
    def handle_deal_stage_changed(self, payload: dict):
        """Handle DealStageChanged event (placeholder for future rules)"""
        # No specific automation rules for stage changes yet
        pass
    
    def _get_inbox_column_id(self) -> Optional[UUID]:
        """Get the Inbox column ID"""
        from ..core.db import DB_ENABLED
        if not DB_ENABLED:
            return None
        
        with get_db_connection() as conn:
            if not conn:
                return None
            
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id FROM task_columns
                        WHERE LOWER(name) = 'inbox'
                        LIMIT 1
                    """)
                    result = cur.fetchone()
                    return UUID(result[0]) if result else None
            except Exception as e:
                logger.error(f"Error finding Inbox column: {str(e)}")
                return None
    
    def _get_negotiation_column_id(self) -> Optional[UUID]:
        """Get the Negotiation column ID"""
        from ..core.db import DB_ENABLED
        if not DB_ENABLED:
            return None
        
        with get_db_connection() as conn:
            if not conn:
                return None
            
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT id FROM task_columns
                        WHERE LOWER(name) LIKE '%negotiation%'
                        LIMIT 1
                    """)
                    result = cur.fetchone()
                    return UUID(result[0]) if result else None
            except Exception as e:
                logger.error(f"Error finding Negotiation column: {str(e)}")
                return None


# Global automation service instance
automation_service = AutomationService()

