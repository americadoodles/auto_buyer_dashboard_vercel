# CRM Task Management Repository
import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.crm import (
    TaskCreate, TaskUpdate, TaskOut, TaskPriorityCreate, TaskPriorityOut,
    TaskStatusCreate, TaskStatusOut, TaskDashboard
)

# ==============================================
# TASK MANAGEMENT FUNCTIONS
# ==============================================

def create_task(task_data: TaskCreate, created_by: UUID) -> TaskOut:
    """Create a new task"""
    if not DB_ENABLED:
        # Fallback for development
        task_id = UUID('12345678-1234-1234-1234-123456789012')
        return TaskOut(
            id=task_id,
            **task_data.model_dump(),
            created_by=created_by,
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO tasks (
                        title, description, assigned_to, priority_id, status_id,
                        due_date, completed_at, related_lead_id, related_contact_id,
                        related_deal_id, is_recurring, recurrence_pattern,
                        created_by, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id, created_at, updated_at
                """, (
                    task_data.title, task_data.description, task_data.assigned_to,
                    task_data.priority_id, task_data.status_id, task_data.due_date,
                    task_data.completed_at, task_data.related_lead_id, task_data.related_contact_id,
                    task_data.related_deal_id, task_data.is_recurring, task_data.recurrence_pattern,
                    created_by, datetime.now(), datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    task_id, created_at, updated_at = result
                    return TaskOut(
                        id=task_id,
                        **task_data.model_dump(),
                        created_by=created_by,
                        created_at=created_at,
                        updated_at=updated_at
                    )
                else:
                    raise Exception("Failed to create task")
                    
        except Exception as e:
            logging.error(f"Error creating task: {str(e)}")
            raise

def get_task(task_id: UUID) -> Optional[TaskOut]:
    """Get a task by ID"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, title, description, assigned_to, priority_id, status_id,
                           due_date, completed_at, related_lead_id, related_contact_id,
                           related_deal_id, is_recurring, recurrence_pattern,
                           created_by, created_at, updated_at
                    FROM tasks WHERE id = %s
                """, (task_id,))
                
                result = cur.fetchone()
                if result:
                    return TaskOut(
                        id=result[0], title=result[1], description=result[2],
                        assigned_to=result[3], priority_id=result[4], status_id=result[5],
                        due_date=result[6], completed_at=result[7], related_lead_id=result[8],
                        related_contact_id=result[9], related_deal_id=result[10],
                        is_recurring=result[11], recurrence_pattern=result[12],
                        created_by=result[13], created_at=result[14], updated_at=result[15]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error fetching task {task_id}: {str(e)}")
            return None

def update_task(task_id: UUID, task_update: TaskUpdate) -> Optional[TaskOut]:
    """Update a task"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                # Build dynamic update query
                update_fields = []
                update_values = []
                
                for field, value in task_update.model_dump(exclude_unset=True).items():
                    if value is not None:
                        update_fields.append(f"{field} = %s")
                        update_values.append(value)
                
                if not update_fields:
                    return get_task(task_id)
                
                update_values.append(datetime.now())  # updated_at
                update_values.append(task_id)  # WHERE clause
                
                cur.execute(f"""
                    UPDATE tasks SET {', '.join(update_fields)}, updated_at = %s
                    WHERE id = %s
                    RETURNING id, title, description, assigned_to, priority_id, status_id,
                              due_date, completed_at, related_lead_id, related_contact_id,
                              related_deal_id, is_recurring, recurrence_pattern,
                              created_by, created_at, updated_at
                """, update_values)
                
                result = cur.fetchone()
                if result:
                    return TaskOut(
                        id=result[0], title=result[1], description=result[2],
                        assigned_to=result[3], priority_id=result[4], status_id=result[5],
                        due_date=result[6], completed_at=result[7], related_lead_id=result[8],
                        related_contact_id=result[9], related_deal_id=result[10],
                        is_recurring=result[11], recurrence_pattern=result[12],
                        created_by=result[13], created_at=result[14], updated_at=result[15]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating task {task_id}: {str(e)}")
            return None

def delete_task(task_id: UUID) -> bool:
    """Delete a task"""
    if not DB_ENABLED:
        return True
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM tasks WHERE id = %s", (task_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting task {task_id}: {str(e)}")
            return False

def list_tasks(
    skip: int = 0,
    limit: int = 100,
    assigned_to: Optional[UUID] = None,
    priority_id: Optional[int] = None,
    status_id: Optional[int] = None,
    due_date_from: Optional[datetime] = None,
    due_date_to: Optional[datetime] = None,
    related_lead_id: Optional[UUID] = None,
    related_contact_id: Optional[UUID] = None,
    related_deal_id: Optional[UUID] = None,
    search: Optional[str] = None
) -> List[TaskOut]:
    """Get tasks with optional filtering"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                where_conditions = []
                query_params = []
                
                if assigned_to:
                    where_conditions.append("assigned_to = %s")
                    query_params.append(assigned_to)
                
                if priority_id:
                    where_conditions.append("priority_id = %s")
                    query_params.append(priority_id)
                
                if status_id:
                    where_conditions.append("status_id = %s")
                    query_params.append(status_id)
                
                if due_date_from:
                    where_conditions.append("due_date >= %s")
                    query_params.append(due_date_from)
                
                if due_date_to:
                    where_conditions.append("due_date <= %s")
                    query_params.append(due_date_to)
                
                if related_lead_id:
                    where_conditions.append("related_lead_id = %s")
                    query_params.append(related_lead_id)
                
                if related_contact_id:
                    where_conditions.append("related_contact_id = %s")
                    query_params.append(related_contact_id)
                
                if related_deal_id:
                    where_conditions.append("related_deal_id = %s")
                    query_params.append(related_deal_id)
                
                if search:
                    where_conditions.append("(title ILIKE %s OR description ILIKE %s)")
                    search_term = f"%{search}%"
                    query_params.extend([search_term, search_term])
                
                where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
                
                cur.execute(f"""
                    SELECT id, title, description, assigned_to, priority_id, status_id,
                           due_date, completed_at, related_lead_id, related_contact_id,
                           related_deal_id, is_recurring, recurrence_pattern,
                           created_by, created_at, updated_at
                    FROM tasks
                    WHERE {where_clause}
                    ORDER BY created_at DESC
                    LIMIT %s OFFSET %s
                """, query_params + [limit, skip])
                
                results = cur.fetchall()
                tasks = []
                
                for result in results:
                    tasks.append(TaskOut(
                        id=result[0], title=result[1], description=result[2],
                        assigned_to=result[3], priority_id=result[4], status_id=result[5],
                        due_date=result[6], completed_at=result[7], related_lead_id=result[8],
                        related_contact_id=result[9], related_deal_id=result[10],
                        is_recurring=result[11], recurrence_pattern=result[12],
                        created_by=result[13], created_at=result[14], updated_at=result[15]
                    ))
                
                return tasks
                
        except Exception as e:
            logging.error(f"Error fetching tasks: {str(e)}")
            return []

def get_user_tasks(user_id: UUID) -> List[TaskOut]:
    """Get tasks assigned to a specific user"""
    return list_tasks(assigned_to=user_id)

def complete_task(task_id: UUID, user_id: UUID) -> bool:
    """Mark a task as completed"""
    if not DB_ENABLED:
        return True
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE tasks 
                    SET completed_at = %s, updated_at = %s
                    WHERE id = %s AND assigned_to = %s
                """, (datetime.now(), datetime.now(), task_id, user_id))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error completing task {task_id}: {str(e)}")
            return False

def get_task_dashboard() -> List[TaskDashboard]:
    """Get task dashboard view"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, title, due_date, priority_name, priority_color,
                           status_name, status_color, assigned_to_name, created_at
                    FROM v_task_dashboard
                    ORDER BY due_date ASC NULLS LAST, created_at DESC
                """)
                
                results = cur.fetchall()
                dashboard_tasks = []
                
                for result in results:
                    dashboard_tasks.append(TaskDashboard(
                        id=result[0], title=result[1], due_date=result[2],
                        priority_name=result[3], priority_color=result[4],
                        status_name=result[5], status_color=result[6],
                        assigned_to_name=result[7], created_at=result[8]
                    ))
                
                return dashboard_tasks
                
        except Exception as e:
            logging.error(f"Error fetching task dashboard: {str(e)}")
            return []

# ==============================================
# TASK PRIORITY MANAGEMENT FUNCTIONS
# ==============================================

def create_task_priority(priority_data: TaskPriorityCreate) -> TaskPriorityOut:
    """Create a new task priority"""
    if not DB_ENABLED:
        return TaskPriorityOut(
            id=1,
            **priority_data.model_dump(),
            created_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO task_priorities (name, description, color_code, sort_order)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, created_at
                """, (
                    priority_data.name, priority_data.description,
                    priority_data.color_code, priority_data.sort_order
                ))
                
                result = cur.fetchone()
                if result:
                    priority_id, created_at = result
                    return TaskPriorityOut(
                        id=priority_id,
                        **priority_data.model_dump(),
                        created_at=created_at
                    )
                else:
                    raise Exception("Failed to create task priority")
                    
        except Exception as e:
            logging.error(f"Error creating task priority: {str(e)}")
            raise

def get_task_priorities() -> List[TaskPriorityOut]:
    """Get all task priorities"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, description, color_code, sort_order, created_at
                    FROM task_priorities
                    ORDER BY sort_order ASC, name ASC
                """)
                
                results = cur.fetchall()
                priorities = []
                
                for result in results:
                    priorities.append(TaskPriorityOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], sort_order=result[4], created_at=result[5]
                    ))
                
                return priorities
                
        except Exception as e:
            logging.error(f"Error fetching task priorities: {str(e)}")
            return []

def update_task_priority(priority_id: int, priority_data: TaskPriorityCreate) -> Optional[TaskPriorityOut]:
    """Update a task priority"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE task_priorities 
                    SET name = %s, description = %s, color_code = %s, sort_order = %s
                    WHERE id = %s
                    RETURNING id, name, description, color_code, sort_order, created_at
                """, (
                    priority_data.name, priority_data.description,
                    priority_data.color_code, priority_data.sort_order, priority_id
                ))
                
                result = cur.fetchone()
                if result:
                    return TaskPriorityOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], sort_order=result[4], created_at=result[5]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating task priority {priority_id}: {str(e)}")
            return None

def delete_task_priority(priority_id: int) -> bool:
    """Delete a task priority"""
    if not DB_ENABLED:
        return True
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM task_priorities WHERE id = %s", (priority_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting task priority {priority_id}: {str(e)}")
            return False

# ==============================================
# TASK STATUS MANAGEMENT FUNCTIONS
# ==============================================

def create_task_status(status_data: TaskStatusCreate) -> TaskStatusOut:
    """Create a new task status"""
    if not DB_ENABLED:
        return TaskStatusOut(
            id=1,
            **status_data.model_dump(),
            created_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO task_statuses (name, description, color_code, is_active, sort_order)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (
                    status_data.name, status_data.description,
                    status_data.color_code, status_data.is_active, status_data.sort_order
                ))
                
                result = cur.fetchone()
                if result:
                    status_id, created_at = result
                    return TaskStatusOut(
                        id=status_id,
                        **status_data.model_dump(),
                        created_at=created_at
                    )
                else:
                    raise Exception("Failed to create task status")
                    
        except Exception as e:
            logging.error(f"Error creating task status: {str(e)}")
            raise

def get_task_statuses() -> List[TaskStatusOut]:
    """Get all task statuses"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, description, color_code, is_active, sort_order, created_at
                    FROM task_statuses
                    WHERE is_active = true
                    ORDER BY sort_order ASC, name ASC
                """)
                
                results = cur.fetchall()
                statuses = []
                
                for result in results:
                    statuses.append(TaskStatusOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=result[4], sort_order=result[5], created_at=result[6]
                    ))
                
                return statuses
                
        except Exception as e:
            logging.error(f"Error fetching task statuses: {str(e)}")
            return []

def update_task_status(status_id: int, status_data: TaskStatusCreate) -> Optional[TaskStatusOut]:
    """Update a task status"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    UPDATE task_statuses 
                    SET name = %s, description = %s, color_code = %s, is_active = %s, sort_order = %s
                    WHERE id = %s
                    RETURNING id, name, description, color_code, is_active, sort_order, created_at
                """, (
                    status_data.name, status_data.description,
                    status_data.color_code, status_data.is_active, status_data.sort_order, status_id
                ))
                
                result = cur.fetchone()
                if result:
                    return TaskStatusOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=result[4], sort_order=result[5], created_at=result[6]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating task status {status_id}: {str(e)}")
            return None

def delete_task_status(status_id: int) -> bool:
    """Delete a task status"""
    if not DB_ENABLED:
        return True
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM task_statuses WHERE id = %s", (status_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting task status {status_id}: {str(e)}")
            return False
