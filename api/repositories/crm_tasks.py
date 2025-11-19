# CRM Task Management Repository (Kanban Structure)
import logging
from typing import List, Optional
from uuid import UUID
from datetime import datetime
import json
from ..core.db import DB_ENABLED
from ..core.db_helpers import get_db_connection
from ..schemas.crm import (
    TaskCreate, TaskUpdate, TaskOut, TaskDashboard,
    TaskBoardCreate, TaskBoardUpdate, TaskBoardOut,
    TaskColumnCreate, TaskColumnUpdate, TaskColumnOut,
    TaskActivityCreate, TaskActivityOut,
    TaskPriority, TaskStatus, TaskBoardScope,
    TaskPriorityCreate, TaskPriorityOut,
    TaskStatusCreate, TaskStatusOut
)

# ==============================================
# TASK MANAGEMENT FUNCTIONS
# ==============================================

def create_task(task_data: TaskCreate, user_id: UUID) -> TaskOut:
    """Create a new task"""
    if not DB_ENABLED:
        # Fallback for development
        task_id = UUID('12345678-1234-1234-1234-123456789012')
        return TaskOut(
            id=task_id,
            **task_data.model_dump(),
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
                        related_type, related_id, title, description, priority, status,
                        column_id, owner_user_id, due_at, created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id, created_at, updated_at
                """, (
                    task_data.related_type, task_data.related_id, task_data.title,
                    task_data.description, task_data.priority.value, task_data.status.value,
                    task_data.column_id, task_data.owner_user_id or user_id,
                    task_data.due_at, datetime.now(), datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    task_id, created_at, updated_at = result
                    
                    # Log activity
                    log_task_activity(task_id, 'created', {'user_id': str(user_id)}, user_id)
                    
                    return TaskOut(
                        id=task_id,
                        **task_data.model_dump(),
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
                    SELECT id, related_type, related_id, title, description, priority, status,
                           column_id, owner_user_id, due_at, created_at, updated_at
                    FROM tasks WHERE id = %s
                """, (task_id,))
                
                result = cur.fetchone()
                if result:
                    return TaskOut(
                        id=result[0], related_type=result[1], related_id=result[2],
                        title=result[3], description=result[4],
                        priority=TaskPriority(result[5]), status=TaskStatus(result[6]),
                        column_id=result[7], owner_user_id=result[8],
                        due_at=result[9], created_at=result[10], updated_at=result[11]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error fetching task {task_id}: {str(e)}")
            return None

def update_task(task_id: UUID, task_update: TaskUpdate, user_id: UUID) -> Optional[TaskOut]:
    """Update a task"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                # Get current task for activity logging
                current_task = get_task(task_id)
                if not current_task:
                    return None
                
                # Build dynamic update query
                update_fields = []
                update_values = []
                changes = {}
                
                update_dict = task_update.model_dump(exclude_unset=True)
                for field, value in update_dict.items():
                    if value is not None:
                        # Handle enum values
                        if field == 'priority' and isinstance(value, TaskPriority):
                            update_fields.append("priority = %s")
                            update_values.append(value.value)
                            changes['priority'] = value.value
                        elif field == 'status' and isinstance(value, TaskStatus):
                            update_fields.append("status = %s")
                            update_values.append(value.value)
                            changes['status'] = value.value
                        else:
                            # Map field names if needed
                            db_field = field
                            if field == 'due_at':
                                db_field = 'due_at'
                            update_fields.append(f"{db_field} = %s")
                            update_values.append(value)
                            changes[field] = value
                
                if not update_fields:
                    return current_task
                
                update_values.append(datetime.now())  # updated_at
                update_values.append(task_id)  # WHERE clause
                
                cur.execute(f"""
                    UPDATE tasks SET {', '.join(update_fields)}, updated_at = %s
                    WHERE id = %s
                    RETURNING id, related_type, related_id, title, description, priority, status,
                              column_id, owner_user_id, due_at, created_at, updated_at
                """, update_values)
                
                result = cur.fetchone()
                if result:
                    # Log activity
                    log_task_activity(task_id, 'updated', {'changes': changes}, user_id)
                    
                    return TaskOut(
                        id=result[0], related_type=result[1], related_id=result[2],
                        title=result[3], description=result[4],
                        priority=TaskPriority(result[5]), status=TaskStatus(result[6]),
                        column_id=result[7], owner_user_id=result[8],
                        due_at=result[9], created_at=result[10], updated_at=result[11]
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
    owner_user_id: Optional[UUID] = None,
    priority: Optional[TaskPriority] = None,
    status: Optional[TaskStatus] = None,
    due_at_from: Optional[datetime] = None,
    due_at_to: Optional[datetime] = None,
    related_type: Optional[str] = None,
    related_id: Optional[UUID] = None,
    column_id: Optional[UUID] = None,
    board_id: Optional[UUID] = None,
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
                
                if owner_user_id:
                    where_conditions.append("t.owner_user_id = %s")
                    query_params.append(owner_user_id)
                
                if priority:
                    where_conditions.append("t.priority = %s")
                    query_params.append(priority.value)
                
                if status:
                    where_conditions.append("t.status = %s")
                    query_params.append(status.value)
                
                if due_at_from:
                    where_conditions.append("t.due_at >= %s")
                    query_params.append(due_at_from)
                
                if due_at_to:
                    where_conditions.append("t.due_at <= %s")
                    query_params.append(due_at_to)
                
                if related_type:
                    where_conditions.append("t.related_type = %s")
                    query_params.append(related_type)
                
                if related_id:
                    where_conditions.append("t.related_id = %s")
                    query_params.append(related_id)
                
                if column_id:
                    where_conditions.append("t.column_id = %s")
                    query_params.append(column_id)
                
                if board_id:
                    where_conditions.append("tc.board_id = %s")
                    query_params.append(board_id)
                
                if search:
                    where_conditions.append("(t.title ILIKE %s OR t.description ILIKE %s)")
                    search_term = f"%{search}%"
                    query_params.extend([search_term, search_term])
                
                where_clause = " AND ".join(where_conditions) if where_conditions else "1=1"
                
                # Join with task_columns if board_id filter is used
                from_clause = "FROM tasks t"
                if board_id:
                    from_clause = "FROM tasks t LEFT JOIN task_columns tc ON t.column_id = tc.id"
                
                cur.execute(f"""
                    SELECT t.id, t.related_type, t.related_id, t.title, t.description, 
                           t.priority, t.status, t.column_id, t.owner_user_id, t.due_at,
                           t.created_at, t.updated_at
                    {from_clause}
                    WHERE {where_clause}
                    ORDER BY t.created_at DESC
                    LIMIT %s OFFSET %s
                """, query_params + [limit, skip])
                
                results = cur.fetchall()
                tasks = []
                
                for result in results:
                    tasks.append(TaskOut(
                        id=result[0], related_type=result[1], related_id=result[2],
                        title=result[3], description=result[4],
                        priority=TaskPriority(result[5]), status=TaskStatus(result[6]),
                        column_id=result[7], owner_user_id=result[8],
                        due_at=result[9], created_at=result[10], updated_at=result[11]
                    ))
                
                return tasks
                
        except Exception as e:
            logging.error(f"Error fetching tasks: {str(e)}")
            return []

def get_user_tasks(user_id: UUID) -> List[TaskOut]:
    """Get tasks assigned to a specific user"""
    return list_tasks(owner_user_id=user_id)

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
                    SET status = %s, updated_at = %s
                    WHERE id = %s AND owner_user_id = %s
                """, (TaskStatus.DONE.value, datetime.now(), task_id, user_id))
                
                if cur.rowcount > 0:
                    log_task_activity(task_id, 'completed', {}, user_id)
                    return True
                return False
                
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
                    SELECT id, title, due_date, priority_name, status_name,
                           owner_user_name, column_name, board_name, created_at
                    FROM v_task_dashboard
                    ORDER BY due_date ASC NULLS LAST, created_at DESC
                """)
                
                results = cur.fetchall()
                dashboard_tasks = []
                
                for result in results:
                    dashboard_tasks.append(TaskDashboard(
                        id=result[0], title=result[1], due_date=result[2],
                        priority_name=result[3], status_name=result[4],
                        owner_user_name=result[5], column_name=result[6],
                        board_name=result[7], created_at=result[8]
                    ))
                
                return dashboard_tasks
                
        except Exception as e:
            logging.error(f"Error fetching task dashboard: {str(e)}")
            return []

# ==============================================
# TASK BOARD MANAGEMENT FUNCTIONS
# ==============================================

def create_task_board(board_data: TaskBoardCreate) -> TaskBoardOut:
    """Create a new task board"""
    if not DB_ENABLED:
        board_id = UUID('12345678-1234-1234-1234-123456789012')
        return TaskBoardOut(
            id=board_id,
            **board_data.model_dump(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO task_boards (name, scope, created_at, updated_at)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, created_at, updated_at
                """, (
                    board_data.name, board_data.scope.value,
                    datetime.now(), datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    return TaskBoardOut(
                        id=result[0],
                        name=board_data.name,
                        scope=board_data.scope,
                        created_at=result[1],
                        updated_at=result[2]
                    )
                else:
                    raise Exception("Failed to create task board")
                    
        except Exception as e:
            logging.error(f"Error creating task board: {str(e)}")
            raise

def get_task_board(board_id: UUID) -> Optional[TaskBoardOut]:
    """Get a task board by ID"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, name, scope, created_at, updated_at
                    FROM task_boards WHERE id = %s
                """, (board_id,))
                
                result = cur.fetchone()
                if result:
                    return TaskBoardOut(
                        id=result[0], name=result[1],
                        scope=TaskBoardScope(result[2]),
                        created_at=result[3], updated_at=result[4]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error fetching task board {board_id}: {str(e)}")
            return None

def list_task_boards(scope: Optional[TaskBoardScope] = None) -> List[TaskBoardOut]:
    """Get all task boards, optionally filtered by scope"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                if scope:
                    cur.execute("""
                        SELECT id, name, scope, created_at, updated_at
                        FROM task_boards WHERE scope = %s
                        ORDER BY name ASC
                    """, (scope.value,))
                else:
                    cur.execute("""
                        SELECT id, name, scope, created_at, updated_at
                        FROM task_boards
                        ORDER BY name ASC
                    """)
                
                results = cur.fetchall()
                boards = []
                
                for result in results:
                    boards.append(TaskBoardOut(
                        id=result[0], name=result[1],
                        scope=TaskBoardScope(result[2]),
                        created_at=result[3], updated_at=result[4]
                    ))
                
                return boards
                
        except Exception as e:
            logging.error(f"Error fetching task boards: {str(e)}")
            return []

# ==============================================
# TASK COLUMN MANAGEMENT FUNCTIONS
# ==============================================

def create_task_column(column_data: TaskColumnCreate) -> TaskColumnOut:
    """Create a new task column"""
    if not DB_ENABLED:
        column_id = UUID('12345678-1234-1234-1234-123456789012')
        return TaskColumnOut(
            id=column_id,
            **column_data.model_dump(),
            created_at=datetime.now(),
            updated_at=datetime.now()
        )
    
    with get_db_connection() as conn:
        if not conn:
            raise Exception("Database connection failed")
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO task_columns (board_id, name, wip_limit, position, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at, updated_at
                """, (
                    column_data.board_id, column_data.name, column_data.wip_limit,
                    column_data.position, datetime.now(), datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    return TaskColumnOut(
                        id=result[0],
                        board_id=column_data.board_id,
                        name=column_data.name,
                        wip_limit=column_data.wip_limit,
                        position=column_data.position,
                        created_at=result[1],
                        updated_at=result[2]
                    )
                else:
                    raise Exception("Failed to create task column")
                    
        except Exception as e:
            logging.error(f"Error creating task column: {str(e)}")
            raise

def get_task_columns(board_id: UUID) -> List[TaskColumnOut]:
    """Get all columns for a board"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, board_id, name, wip_limit, position, created_at, updated_at
                    FROM task_columns
                    WHERE board_id = %s
                    ORDER BY position ASC
                """, (board_id,))
                
                results = cur.fetchall()
                columns = []
                
                for result in results:
                    columns.append(TaskColumnOut(
                        id=result[0], board_id=result[1], name=result[2],
                        wip_limit=result[3], position=result[4],
                        created_at=result[5], updated_at=result[6]
                    ))
                
                return columns
                
        except Exception as e:
            logging.error(f"Error fetching task columns: {str(e)}")
            return []

# ==============================================
# TASK ACTIVITY FUNCTIONS
# ==============================================

def log_task_activity(task_id: UUID, activity_type: str, payload: dict, user_id: Optional[UUID] = None) -> Optional[TaskActivityOut]:
    """Log an activity for a task"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    INSERT INTO task_activity (task_id, type, payload_json, at, user_id)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, at
                """, (
                    task_id, activity_type, json.dumps(payload),
                    datetime.now(), user_id
                ))
                
                result = cur.fetchone()
                if result:
                    return TaskActivityOut(
                        id=result[0],
                        task_id=task_id,
                        type=activity_type,
                        payload_json=payload,
                        user_id=user_id,
                        at=result[1]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error logging task activity: {str(e)}")
            return None

def get_task_activities(task_id: UUID) -> List[TaskActivityOut]:
    """Get all activities for a task"""
    if not DB_ENABLED:
        return []
    
    with get_db_connection() as conn:
        if not conn:
            return []
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT id, task_id, type, payload_json, at, user_id
                    FROM task_activity
                    WHERE task_id = %s
                    ORDER BY at DESC
                """, (task_id,))
                
                results = cur.fetchall()
                activities = []
                
                for result in results:
                    payload = json.loads(result[3]) if result[3] else {}
                    activities.append(TaskActivityOut(
                        id=result[0], task_id=result[1], type=result[2],
                        payload_json=payload, at=result[4], user_id=result[5]
                    ))
                
                return activities
                
        except Exception as e:
            logging.error(f"Error fetching task activities: {str(e)}")
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
                    INSERT INTO task_priorities (name, description, color_code, is_active, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (
                    priority_data.name, priority_data.description,
                    priority_data.color_code, priority_data.is_active,
                    datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    return TaskPriorityOut(
                        id=result[0],
                        name=priority_data.name,
                        description=priority_data.description,
                        color_code=priority_data.color_code,
                        is_active=priority_data.is_active,
                        created_at=result[1]
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
                    SELECT id, name, description, color_code, is_active, created_at
                    FROM task_priorities
                    WHERE is_active = true
                    ORDER BY name
                """)
                
                results = cur.fetchall()
                priorities = []
                
                for result in results:
                    priorities.append(TaskPriorityOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=result[4],
                        created_at=result[5]
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
                    UPDATE task_priorities SET name = %s, description = %s, color_code = %s, is_active = %s
                    WHERE id = %s
                    RETURNING id, name, description, color_code, is_active, created_at
                """, (
                    priority_data.name, priority_data.description,
                    priority_data.color_code, priority_data.is_active, priority_id
                ))
                
                result = cur.fetchone()
                if result:
                    return TaskPriorityOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=result[4],
                        created_at=result[5]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating task priority: {str(e)}")
            return None

def delete_task_priority(priority_id: int) -> bool:
    """Delete a task priority"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM task_priorities WHERE id = %s", (priority_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting task priority: {str(e)}")
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
                    INSERT INTO task_statuses (name, description, color_code, is_active, sort_order, created_at)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    RETURNING id, created_at
                """, (
                    status_data.name, status_data.description,
                    status_data.color_code, status_data.is_active,
                    status_data.sort_order, datetime.now()
                ))
                
                result = cur.fetchone()
                if result:
                    return TaskStatusOut(
                        id=result[0],
                        name=status_data.name,
                        description=status_data.description,
                        color_code=status_data.color_code,
                        is_active=status_data.is_active,
                        sort_order=status_data.sort_order,
                        created_at=result[1]
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
                    ORDER BY sort_order, name
                """)
                
                results = cur.fetchall()
                statuses = []
                
                for result in results:
                    statuses.append(TaskStatusOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=result[4],
                        sort_order=result[5], created_at=result[6]
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
                    UPDATE task_statuses SET name = %s, description = %s, color_code = %s,
                                           is_active = %s, sort_order = %s
                    WHERE id = %s
                    RETURNING id, name, description, color_code, is_active, sort_order, created_at
                """, (
                    status_data.name, status_data.description, status_data.color_code,
                    status_data.is_active, status_data.sort_order, status_id
                ))
                
                result = cur.fetchone()
                if result:
                    return TaskStatusOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=result[4],
                        sort_order=result[5], created_at=result[6]
                    )
                return None
                
        except Exception as e:
            logging.error(f"Error updating task status: {str(e)}")
            return None

def delete_task_status(status_id: int) -> bool:
    """Delete a task status"""
    if not DB_ENABLED:
        return False
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                cur.execute("DELETE FROM task_statuses WHERE id = %s", (status_id,))
                return cur.rowcount > 0
                
        except Exception as e:
            logging.error(f"Error deleting task status: {str(e)}")
            return False
