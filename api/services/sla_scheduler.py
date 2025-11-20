# SLA Scheduler Service
import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime, timedelta
from ..repositories.crm_tasks import list_tasks, update_task, create_task
from ..repositories.crm_leads import get_lead
from ..repositories.crm_contacts import get_contact
from ..schemas.crm import TaskUpdate, TaskCreate, TaskPriority, TaskStatus
from ..core.db_helpers import get_db_connection
from ..services.slack_service import slack_service

logger = logging.getLogger(__name__)


class SLAScheduler:
    """Service for SLA monitoring and escalation"""
    
    def check_overdue_tasks(self) -> int:
        """Check for overdue tasks, tag them, and escalate to Slack"""
        try:
            # Get all open tasks
            all_tasks = list_tasks(status=TaskStatus.OPEN)
            overdue_count = 0
            
            for task in all_tasks:
                if task.due_at and task.due_at < datetime.now():
                    # Task is overdue
                    if not self._has_tag(task.id, "Overdue"):
                        self._add_tag(task.id, "Overdue")
                        overdue_count += 1
                        
                        # Escalate to Slack DM
                        self._escalate_to_slack(task)
            
            return overdue_count
            
        except Exception as e:
            logger.error(f"Error checking overdue tasks: {str(e)}")
            return 0
    
    def check_no_response_48h(self) -> int:
        """Check for leads with no response 48h after Contacted status"""
        try:
            from ..core.db import DB_ENABLED
            if not DB_ENABLED:
                return 0
            
            with get_db_connection() as conn:
                if not conn:
                    return 0
                
                # Find leads that were contacted 48+ hours ago but have no follow-up communication
                # This is a simplified check - in production, you'd want more sophisticated logic
                cutoff_time = datetime.now() - timedelta(hours=48)
                
                with conn.cursor() as cur:
                    # Find leads with "Contacted" status or similar, created 48+ hours ago
                    # and check if there's a follow-up task or communication
                    cur.execute("""
                        SELECT DISTINCT l.id, l.assigned_to
                        FROM leads l
                        LEFT JOIN communications c ON c.to_lead_id = l.id AND c.created_at > %s
                        LEFT JOIN tasks t ON t.related_type = 'lead' AND t.related_id = l.id 
                            AND t.title LIKE '%%Follow-up%%' AND t.created_at > %s
                        WHERE l.created_at < %s
                        AND c.id IS NULL
                        AND t.id IS NULL
                        AND l.assigned_to IS NOT NULL
                    """, (cutoff_time, cutoff_time, cutoff_time))
                    
                    results = cur.fetchall()
                    created_count = 0
                    
                    for lead_id, assigned_to in results:
                        # Check if escalation task already exists
                        existing_tasks = list_tasks(
                            related_type="lead",
                            related_id=lead_id,
                            search="Escalate follow-up"
                        )
                        
                        if not existing_tasks:
                            # Create "Escalate follow-up" task
                            inbox_column_id = self._get_inbox_column_id()
                            if inbox_column_id:
                                task_data = TaskCreate(
                                    related_type="lead",
                                    related_id=lead_id,
                                    title="Escalate follow-up",
                                    description=f"No response 48h after contact for lead {lead_id}",
                                    priority=TaskPriority.HIGH,
                                    status=TaskStatus.OPEN,
                                    column_id=inbox_column_id,
                                    owner_user_id=assigned_to,
                                    due_at=None
                                )
                                
                                create_task(task_data, assigned_to)
                                created_count += 1
                                logger.info(f"Created escalate follow-up task for lead {lead_id}")
                    
                    return created_count
                    
        except Exception as e:
            logger.error(f"Error checking no response 48h: {str(e)}")
            return 0
    
    def _has_tag(self, task_id: UUID, tag_name: str) -> bool:
        """Check if a task has a specific tag"""
        from ..core.db import DB_ENABLED
        if not DB_ENABLED:
            return False
        
        with get_db_connection() as conn:
            if not conn:
                return False
            
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        SELECT 1 FROM task_tags
                        WHERE task_id = %s AND tag_name = %s
                        LIMIT 1
                    """, (task_id, tag_name))
                    
                    return cur.fetchone() is not None
                    
            except Exception as e:
                logger.error(f"Error checking tag: {str(e)}")
                return False
    
    def _add_tag(self, task_id: UUID, tag_name: str) -> bool:
        """Add a tag to a task"""
        from ..core.db import DB_ENABLED
        if not DB_ENABLED:
            return False
        
        with get_db_connection() as conn:
            if not conn:
                return False
            
            try:
                with conn.cursor() as cur:
                    cur.execute("""
                        INSERT INTO task_tags (task_id, tag_name, created_at)
                        VALUES (%s, %s, %s)
                        ON CONFLICT (task_id, tag_name) DO NOTHING
                    """, (task_id, tag_name, datetime.now()))
                    
                    return cur.rowcount > 0
                    
            except Exception as e:
                logger.error(f"Error adding tag: {str(e)}")
                return False
    
    def _escalate_to_slack(self, task):
        """Escalate overdue task to Slack DM"""
        try:
            if not slack_service.enabled:
                return
            
            # Get task owner info
            from ..repositories.users import get_user_by_id
            owner = get_user_by_id(task.owner_user_id) if task.owner_user_id else None
            
            if not owner:
                logger.warning(f"No owner for task {task.id}")
                return
            
            # Create Slack message
            message = f"⚠️ *Overdue Task Alert*\n\n"
            message += f"*Task:* {task.title}\n"
            message += f"*Due:* {task.due_at.strftime('%Y-%m-%d %H:%M') if task.due_at else 'N/A'}\n"
            message += f"*Priority:* {task.priority.value}\n"
            
            if task.related_type and task.related_id:
                message += f"*Related:* {task.related_type} {task.related_id}\n"
            
            # Send DM via Slack (using webhook for now - in production, use Slack API for DMs)
            # For now, we'll send to the configured channel with @mention
            slack_service.send_task_notification(
                message=message,
                task_id=str(task.id),
                owner_email=owner.email if hasattr(owner, 'email') else None
            )
            
        except Exception as e:
            logger.error(f"Error escalating to Slack: {str(e)}")
    
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


# Global SLA scheduler instance
sla_scheduler = SLAScheduler()

