# Background Jobs Service
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Optional
from ..services.event_bus import event_bus
from ..services.automation_service import automation_service
from ..services.sla_scheduler import sla_scheduler
from ..services.slack_service import slack_service
from ..repositories.crm_tasks import list_tasks
from ..schemas.crm import TaskStatus

logger = logging.getLogger(__name__)


class BackgroundJobScheduler:
    """Background job scheduler for periodic tasks"""
    
    def __init__(self):
        self.running = False
        self._event_processor_task: Optional[asyncio.Task] = None
        self._sla_checker_task: Optional[asyncio.Task] = None
        self._daily_digest_task: Optional[asyncio.Task] = None
    
    async def start(self):
        """Start all background jobs"""
        if self.running:
            logger.warning("Background jobs already running")
            return
        
        self.running = True
        logger.info("Starting background jobs...")
        
        # Register automation handlers
        from ..schemas.events import EventType
        event_bus.subscribe(EventType.LEAD_CREATED, automation_service.handle_lead_created)
        event_bus.subscribe(EventType.COMMUNICATION_LOGGED, automation_service.handle_communication_logged)
        event_bus.subscribe(EventType.DEAL_CREATED, automation_service.handle_deal_created)
        event_bus.subscribe(EventType.DEAL_STAGE_CHANGED, automation_service.handle_deal_stage_changed)
        
        # Start event processor (runs every 10 seconds)
        self._event_processor_task = asyncio.create_task(self._process_events_loop())
        
        # Start SLA checker (runs every hour)
        self._sla_checker_task = asyncio.create_task(self._sla_check_loop())
        
        # Start daily digest (runs once per day at 9 AM)
        self._daily_digest_task = asyncio.create_task(self._daily_digest_loop())
        
        logger.info("Background jobs started")
    
    async def stop(self):
        """Stop all background jobs"""
        if not self.running:
            return
        
        self.running = False
        logger.info("Stopping background jobs...")
        
        if self._event_processor_task:
            self._event_processor_task.cancel()
        if self._sla_checker_task:
            self._sla_checker_task.cancel()
        if self._daily_digest_task:
            self._daily_digest_task.cancel()
        
        logger.info("Background jobs stopped")
    
    async def _process_events_loop(self):
        """Process pending events from outbox"""
        while self.running:
            try:
                processed = event_bus.process_pending_events(batch_size=100)
                if processed > 0:
                    logger.info(f"Processed {processed} events from outbox")
                
                # Reset failed events for retry
                reset_count = event_bus.reset_failed_events(max_retries=3)
                if reset_count > 0:
                    logger.info(f"Reset {reset_count} failed events for retry")
                
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in event processor loop: {str(e)}")
                await asyncio.sleep(10)
    
    async def _sla_check_loop(self):
        """Check SLA violations periodically"""
        while self.running:
            try:
                # Check overdue tasks
                overdue_count = sla_scheduler.check_overdue_tasks()
                if overdue_count > 0:
                    logger.info(f"Found {overdue_count} overdue tasks")
                
                # Check no response 48h rule
                escalate_count = sla_scheduler.check_no_response_48h()
                if escalate_count > 0:
                    logger.info(f"Created {escalate_count} escalate follow-up tasks")
                
                await asyncio.sleep(3600)  # Check every hour
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in SLA check loop: {str(e)}")
                await asyncio.sleep(3600)
    
    async def _daily_digest_loop(self):
        """Send daily digest at 9 AM"""
        while self.running:
            try:
                now = datetime.now()
                # Calculate next 9 AM
                next_9am = now.replace(hour=9, minute=0, second=0, microsecond=0)
                if next_9am <= now:
                    next_9am += timedelta(days=1)
                
                wait_seconds = (next_9am - now).total_seconds()
                logger.info(f"Daily digest scheduled for {next_9am}, waiting {wait_seconds} seconds")
                
                await asyncio.sleep(wait_seconds)
                
                # Send daily digest
                if self.running:
                    self._send_daily_digest()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in daily digest loop: {str(e)}")
                await asyncio.sleep(3600)
    
    def _send_daily_digest(self):
        """Send daily task digest"""
        try:
            # Get task summary
            all_tasks = list_tasks()
            now = datetime.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            overdue_count = sum(1 for t in all_tasks if t.due_at and t.due_at < now and t.status != TaskStatus.DONE)
            due_today_count = sum(1 for t in all_tasks if t.due_at and today_start <= t.due_at < today_start + timedelta(days=1) and t.status != TaskStatus.DONE)
            new_tasks_count = sum(1 for t in all_tasks if t.created_at >= today_start)
            
            summary = {
                "overdue_count": overdue_count,
                "due_today_count": due_today_count,
                "new_tasks_count": new_tasks_count
            }
            
            slack_service.send_daily_digest(summary)
            
        except Exception as e:
            logger.error(f"Error sending daily digest: {str(e)}")


# Global background job scheduler instance
background_job_scheduler = BackgroundJobScheduler()

