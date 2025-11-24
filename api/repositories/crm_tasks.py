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
                        related_type, related_id, title, description, priority_id, status_id,
                        column_id, owner_user_id, assigned_to, due_at, due_date,
                        related_lead_id, related_contact_id, related_deal_id,
                        created_at, updated_at
                    ) VALUES (
                        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                    ) RETURNING id, created_at, updated_at
                """, (
                    task_data.related_type, task_data.related_id, task_data.title,
                    task_data.description, task_data.priority_id, task_data.status_id,
                    task_data.column_id, task_data.owner_user_id or user_id, task_data.assigned_to,
                    task_data.due_at, task_data.due_date,
                    task_data.related_lead_id, task_data.related_contact_id, task_data.related_deal_id,
                    datetime.now(), datetime.now()
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
                    SELECT t.id, t.related_type, t.related_id, t.title, t.description, 
                           t.priority_id, t.status_id, t.column_id, t.owner_user_id, t.assigned_to,
                           t.due_at, t.due_date, t.related_lead_id, t.related_contact_id, t.related_deal_id,
                           t.created_at, t.updated_at,
                           tp.name as priority_name, ts.name as status_name
                    FROM tasks t
                    LEFT JOIN task_priorities tp ON t.priority_id = tp.id
                    LEFT JOIN task_statuses ts ON t.status_id = ts.id
                    WHERE t.id = %s
                """, (task_id,))
                
                result = cur.fetchone()
                if result:
                    # Map priority/status names to enums for backward compatibility
                    priority_enum = None
                    status_enum = None
                    if result[17]:  # priority_name
                        try:
                            priority_enum = TaskPriority(result[17])
                        except ValueError:
                            pass
                    if result[18]:  # status_name
                        try:
                            status_enum = TaskStatus(result[18])
                        except ValueError:
                            pass
                    
                    return TaskOut(
                        id=result[0], related_type=result[1], related_id=result[2],
                        title=result[3], description=result[4],
                        priority_id=result[5], status_id=result[6],
                        column_id=result[7], owner_user_id=result[8], assigned_to=result[9],
                        due_at=result[10], due_date=result[11],
                        related_lead_id=result[12], related_contact_id=result[13], related_deal_id=result[14],
                        created_at=result[15], updated_at=result[16],
                        priority=priority_enum, status=status_enum,
                        priority_name=result[17], status_name=result[18]
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
                        # Map field names to database columns
                        db_field = field
                        if field == 'due_at' or field == 'due_date':
                            db_field = field
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
                """, update_values)
                
                # Fetch updated task with joins
                cur.execute("""
                    SELECT t.id, t.related_type, t.related_id, t.title, t.description, 
                           t.priority_id, t.status_id, t.column_id, t.owner_user_id, t.assigned_to,
                           t.due_at, t.due_date, t.related_lead_id, t.related_contact_id, t.related_deal_id,
                           t.created_at, t.updated_at,
                           tp.name as priority_name, ts.name as status_name
                    FROM tasks t
                    LEFT JOIN task_priorities tp ON t.priority_id = tp.id
                    LEFT JOIN task_statuses ts ON t.status_id = ts.id
                    WHERE t.id = %s
                """, (task_id,))
                
                result = cur.fetchone()
                if result:
                    # Log activity
                    log_task_activity(task_id, 'updated', {'changes': changes}, user_id)
                    
                    # Map priority/status names to enums for backward compatibility
                    priority_enum = None
                    status_enum = None
                    if result[17]:  # priority_name
                        try:
                            priority_enum = TaskPriority(result[17])
                        except ValueError:
                            pass
                    if result[18]:  # status_name
                        try:
                            status_enum = TaskStatus(result[18])
                        except ValueError:
                            pass
                    
                    return TaskOut(
                        id=result[0], related_type=result[1], related_id=result[2],
                        title=result[3], description=result[4],
                        priority_id=result[5], status_id=result[6],
                        column_id=result[7], owner_user_id=result[8], assigned_to=result[9],
                        due_at=result[10], due_date=result[11],
                        related_lead_id=result[12], related_contact_id=result[13], related_deal_id=result[14],
                        created_at=result[15], updated_at=result[16],
                        priority=priority_enum, status=status_enum,
                        priority_name=result[17], status_name=result[18]
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
                
                # Lookup priority_id and status_id from enum values if provided
                priority_id_filter = None
                if priority:
                    cur.execute("SELECT id FROM task_priorities WHERE LOWER(name) = LOWER(%s) LIMIT 1", (priority.value,))
                    priority_result = cur.fetchone()
                    if priority_result:
                        priority_id_filter = priority_result[0]
                
                status_id_filter = None
                if status:
                    cur.execute("SELECT id FROM task_statuses WHERE LOWER(name) = LOWER(%s) LIMIT 1", (status.value,))
                    status_result = cur.fetchone()
                    if status_result:
                        status_id_filter = status_result[0]
                
                if priority_id_filter:
                    where_conditions.append("t.priority_id = %s")
                    query_params.append(priority_id_filter)
                
                if status_id_filter:
                    where_conditions.append("t.status_id = %s")
                    query_params.append(status_id_filter)
                
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
                
                # Join with task_columns if board_id filter is used, and always join with priorities/statuses
                from_clause = "FROM tasks t"
                if board_id:
                    from_clause = "FROM tasks t LEFT JOIN task_columns tc ON t.column_id = tc.id"
                from_clause += " LEFT JOIN task_priorities tp ON t.priority_id = tp.id"
                from_clause += " LEFT JOIN task_statuses ts ON t.status_id = ts.id"
                
                cur.execute(f"""
                    SELECT t.id, t.related_type, t.related_id, t.title, t.description, 
                           t.priority_id, t.status_id, t.column_id, t.owner_user_id, t.assigned_to,
                           t.due_at, t.due_date, t.related_lead_id, t.related_contact_id, t.related_deal_id,
                           t.created_at, t.updated_at,
                           tp.name as priority_name, ts.name as status_name
                    {from_clause}
                    WHERE {where_clause}
                    ORDER BY t.created_at DESC
                    LIMIT %s OFFSET %s
                """, query_params + [limit, skip])
                
                results = cur.fetchall()
                tasks = []
                
                for result in results:
                    # Map priority/status names to enums for backward compatibility
                    priority_enum = None
                    status_enum = None
                    if result[17]:  # priority_name
                        try:
                            priority_enum = TaskPriority(result[17])
                        except ValueError:
                            pass
                    if result[18]:  # status_name
                        try:
                            status_enum = TaskStatus(result[18])
                        except ValueError:
                            pass
                    
                    tasks.append(TaskOut(
                        id=result[0], related_type=result[1], related_id=result[2],
                        title=result[3], description=result[4],
                        priority_id=result[5], status_id=result[6],
                        column_id=result[7], owner_user_id=result[8], assigned_to=result[9],
                        due_at=result[10], due_date=result[11],
                        related_lead_id=result[12], related_contact_id=result[13], related_deal_id=result[14],
                        created_at=result[15], updated_at=result[16],
                        priority=priority_enum, status=status_enum,
                        priority_name=result[17], status_name=result[18]
                    ))
                
                return tasks
                
        except Exception as e:
            logging.error(f"Error fetching tasks: {str(e)}")
            return []

def get_user_tasks(user_id: UUID) -> List[TaskOut]:
    """Get tasks assigned to a specific user"""
    return list_tasks(owner_user_id=user_id)

def complete_task(task_id: UUID, user_id: UUID) -> bool:
    """Mark a task as completed. Ownership check should be done at the route level."""
    if not DB_ENABLED:
        return True
    
    with get_db_connection() as conn:
        if not conn:
            return False
        
        try:
            with conn.cursor() as cur:
                # Find the "Completed" status_id
                cur.execute("SELECT id FROM task_statuses WHERE LOWER(name) = LOWER(%s) LIMIT 1", ('Completed',))
                status_result = cur.fetchone()
                if not status_result:
                    # Fallback: try 'Done'
                    cur.execute("SELECT id FROM task_statuses WHERE LOWER(name) = LOWER(%s) LIMIT 1", ('Done',))
                    status_result = cur.fetchone()
                
                if status_result:
                    cur.execute("""
                        UPDATE tasks 
                        SET status_id = %s, completed_at = %s, updated_at = %s
                        WHERE id = %s
                    """, (status_result[0], datetime.now(), datetime.now(), task_id))
                else:
                    logging.error("Could not find 'Completed' or 'Done' status in task_statuses table")
                    return False
                
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

def get_task_board_detail(board_id: UUID):
    """Get task board with columns and task counts"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                # Get board info
                cur.execute("""
                    SELECT id, name, scope, created_at, updated_at
                    FROM task_boards WHERE id = %s
                """, (board_id,))
                
                board_result = cur.fetchone()
                if not board_result:
                    return None
                
                # Get columns with task counts
                cur.execute("""
                    SELECT 
                        tc.id, tc.board_id, tc.name, tc.wip_limit, tc.position,
                        tc.created_at, tc.updated_at,
                        COUNT(t.id) as task_count
                    FROM task_columns tc
                    LEFT JOIN tasks t ON t.column_id = tc.id
                    WHERE tc.board_id = %s
                    GROUP BY tc.id, tc.board_id, tc.name, tc.wip_limit, tc.position,
                             tc.created_at, tc.updated_at
                    ORDER BY tc.position ASC
                """, (board_id,))
                
                from ..schemas.crm import TaskColumnWithCount, TaskBoardScope
                
                columns = []
                for result in cur.fetchall():
                    columns.append(TaskColumnWithCount(
                        id=result[0],
                        board_id=result[1],
                        name=result[2],
                        wip_limit=result[3],
                        position=result[4],
                        created_at=result[5],
                        updated_at=result[6],
                        task_count=result[7]
                    ))
                
                from ..schemas.crm import TaskBoardDetailOut
                return TaskBoardDetailOut(
                    id=board_result[0],
                    name=board_result[1],
                    scope=TaskBoardScope(board_result[2]),
                    created_at=board_result[3],
                    updated_at=board_result[4],
                    columns=columns
                )
                
        except Exception as e:
            logging.error(f"Error fetching task board detail {board_id}: {str(e)}")
            return None

def check_column_wip_limit(column_id: UUID) -> tuple[Optional[int], int]:
    """Check WIP limit for a column. Returns (wip_limit, current_count)"""
    if not DB_ENABLED:
        return (None, 0)
    
    with get_db_connection() as conn:
        if not conn:
            return (None, 0)
        
        try:
            with conn.cursor() as cur:
                cur.execute("""
                    SELECT wip_limit, COUNT(t.id) as current_count
                    FROM task_columns tc
                    LEFT JOIN tasks t ON t.column_id = tc.id
                    WHERE tc.id = %s
                    GROUP BY tc.wip_limit
                """, (column_id,))
                
                result = cur.fetchone()
                if result:
                    return (result[0], result[1])
                return (None, 0)
                
        except Exception as e:
            logging.error(f"Error checking WIP limit for column {column_id}: {str(e)}")
            return (None, 0)

def move_task(task_id: UUID, column_id: UUID, user_id: UUID, admin_override: bool = False) -> Optional[TaskOut]:
    """Move a task to a different column with WIP validation"""
    if not DB_ENABLED:
        return None
    
    with get_db_connection() as conn:
        if not conn:
            return None
        
        try:
            with conn.cursor() as cur:
                # Check WIP limit if not admin override
                if not admin_override:
                    wip_limit, current_count = check_column_wip_limit(column_id)
                    if wip_limit is not None and current_count >= wip_limit:
                        raise ValueError(f"Column WIP limit ({wip_limit}) exceeded. Current count: {current_count}")
                
                # Get current task
                current_task = get_task(task_id)
                if not current_task:
                    return None
                
                # Update task column
                cur.execute("""
                    UPDATE tasks 
                    SET column_id = %s, updated_at = %s
                    WHERE id = %s
                """, (column_id, datetime.now(), task_id))
                
                # Fetch updated task with joins
                cur.execute("""
                    SELECT t.id, t.related_type, t.related_id, t.title, t.description, 
                           t.priority_id, t.status_id, t.column_id, t.owner_user_id, t.assigned_to,
                           t.due_at, t.due_date, t.related_lead_id, t.related_contact_id, t.related_deal_id,
                           t.created_at, t.updated_at,
                           tp.name as priority_name, ts.name as status_name
                    FROM tasks t
                    LEFT JOIN task_priorities tp ON t.priority_id = tp.id
                    LEFT JOIN task_statuses ts ON t.status_id = ts.id
                    WHERE t.id = %s
                """, (task_id,))
                
                result = cur.fetchone()
                if result:
                    # Log activity
                    log_task_activity(
                        task_id, 
                        'moved', 
                        {
                            'from_column_id': str(current_task.column_id) if current_task.column_id else None,
                            'to_column_id': str(column_id),
                            'admin_override': admin_override
                        }, 
                        user_id
                    )
                    
                    # Map priority/status names to enums for backward compatibility
                    priority_enum = None
                    status_enum = None
                    if result[17]:  # priority_name
                        try:
                            priority_enum = TaskPriority(result[17])
                        except ValueError:
                            pass
                    if result[18]:  # status_name
                        try:
                            status_enum = TaskStatus(result[18])
                        except ValueError:
                            pass
                    
                    return TaskOut(
                        id=result[0], related_type=result[1], related_id=result[2],
                        title=result[3], description=result[4],
                        priority_id=result[5], status_id=result[6],
                        column_id=result[7], owner_user_id=result[8], assigned_to=result[9],
                        due_at=result[10], due_date=result[11],
                        related_lead_id=result[12], related_contact_id=result[13], related_deal_id=result[14],
                        created_at=result[15], updated_at=result[16],
                        priority=priority_enum, status=status_enum,
                        priority_name=result[17], status_name=result[18]
                    )
                return None
                
        except ValueError:
            raise
        except Exception as e:
            logging.error(f"Error moving task {task_id}: {str(e)}")
            return None

def bulk_move_tasks(task_ids: List[UUID], column_id: UUID, user_id: UUID, admin_override: bool = False) -> dict:
    """Bulk move tasks to a column with WIP validation"""
    if not DB_ENABLED:
        return {'success': [], 'failed': []}
    
    # Check WIP limit if not admin override
    if not admin_override:
        wip_limit, current_count = check_column_wip_limit(column_id)
        if wip_limit is not None:
            available_slots = wip_limit - current_count
            if available_slots < len(task_ids):
                raise ValueError(
                    f"Column WIP limit ({wip_limit}) would be exceeded. "
                    f"Current count: {current_count}, Available slots: {available_slots}, "
                    f"Requested moves: {len(task_ids)}"
                )
    
    success = []
    failed = []
    
    with get_db_connection() as conn:
        if not conn:
            return {'success': [], 'failed': task_ids}
        
        try:
            with conn.cursor() as cur:
                for task_id in task_ids:
                    try:
                        current_task = get_task(task_id)
                        if not current_task:
                            failed.append({'task_id': task_id, 'reason': 'Task not found'})
                            continue
                        
                        cur.execute("""
                            UPDATE tasks 
                            SET column_id = %s, updated_at = %s
                            WHERE id = %s
                            RETURNING id
                        """, (column_id, datetime.now(), task_id))
                        
                        if cur.fetchone():
                            log_task_activity(
                                task_id,
                                'moved',
                                {
                                    'from_column_id': str(current_task.column_id) if current_task.column_id else None,
                                    'to_column_id': str(column_id),
                                    'bulk_operation': True,
                                    'admin_override': admin_override
                                },
                                user_id
                            )
                            success.append(task_id)
                        else:
                            failed.append({'task_id': task_id, 'reason': 'Update failed'})
                    except Exception as e:
                        failed.append({'task_id': task_id, 'reason': str(e)})
                
                conn.commit()
                return {'success': success, 'failed': failed}
                
        except ValueError:
            raise
        except Exception as e:
            logging.error(f"Error in bulk move tasks: {str(e)}")
            return {'success': [], 'failed': task_ids}

def bulk_change_task_owner(task_ids: List[UUID], owner_user_id: UUID, user_id: UUID) -> dict:
    """Bulk change task owner"""
    if not DB_ENABLED:
        return {'success': [], 'failed': []}
    
    success = []
    failed = []
    
    with get_db_connection() as conn:
        if not conn:
            return {'success': [], 'failed': task_ids}
        
        try:
            with conn.cursor() as cur:
                for task_id in task_ids:
                    try:
                        cur.execute("""
                            UPDATE tasks 
                            SET owner_user_id = %s, updated_at = %s
                            WHERE id = %s
                            RETURNING id
                        """, (owner_user_id, datetime.now(), task_id))
                        
                        if cur.fetchone():
                            log_task_activity(
                                task_id,
                                'assigned',
                                {
                                    'owner_user_id': str(owner_user_id),
                                    'bulk_operation': True
                                },
                                user_id
                            )
                            success.append(task_id)
                        else:
                            failed.append({'task_id': task_id, 'reason': 'Task not found'})
                    except Exception as e:
                        failed.append({'task_id': task_id, 'reason': str(e)})
                
                conn.commit()
                return {'success': success, 'failed': failed}
                
        except Exception as e:
            logging.error(f"Error in bulk change task owner: {str(e)}")
            return {'success': [], 'failed': task_ids}

def bulk_close_tasks(task_ids: List[UUID], user_id: UUID) -> dict:
    """Bulk close tasks (set status to Done)"""
    if not DB_ENABLED:
        return {'success': [], 'failed': []}
    
    success = []
    failed = []
    
    with get_db_connection() as conn:
        if not conn:
            return {'success': [], 'failed': task_ids}
        
        try:
            with conn.cursor() as cur:
                # Find the "Completed" status_id once
                cur.execute("SELECT id FROM task_statuses WHERE LOWER(name) = LOWER(%s) LIMIT 1", ('Completed',))
                status_result = cur.fetchone()
                if not status_result:
                    # Fallback: try 'Done'
                    cur.execute("SELECT id FROM task_statuses WHERE LOWER(name) = LOWER(%s) LIMIT 1", ('Done',))
                    status_result = cur.fetchone()
                
                if not status_result:
                    logging.error("Could not find 'Completed' or 'Done' status in task_statuses table")
                    return {'success': [], 'failed': [{'task_id': tid, 'reason': 'Status not found'} for tid in task_ids]}
                
                status_id = status_result[0]
                
                for task_id in task_ids:
                    try:
                        cur.execute("""
                            UPDATE tasks 
                            SET status_id = %s, completed_at = %s, updated_at = %s
                            WHERE id = %s
                            RETURNING id
                        """, (status_id, datetime.now(), datetime.now(), task_id))
                        
                        if cur.fetchone():
                            log_task_activity(
                                task_id,
                                'completed',
                                {
                                    'bulk_operation': True
                                },
                                user_id
                            )
                            success.append(task_id)
                        else:
                            failed.append({'task_id': task_id, 'reason': 'Task not found'})
                    except Exception as e:
                        failed.append({'task_id': task_id, 'reason': str(e)})
                
                conn.commit()
                return {'success': success, 'failed': failed}
                
        except Exception as e:
            logging.error(f"Error in bulk close tasks: {str(e)}")
            return {'success': [], 'failed': task_ids}

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
                    INSERT INTO task_priorities (name, description, color_code, created_at)
                    VALUES (%s, %s, %s, %s)
                    RETURNING id, created_at
                """, (
                    priority_data.name, priority_data.description,
                    priority_data.color_code, datetime.now()
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
                    SELECT id, name, description, color_code, created_at, sort_order
                    FROM task_priorities
                    ORDER BY name
                """)
                
                results = cur.fetchall()
                priorities = []
                
                for result in results:
                    priorities.append(TaskPriorityOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=True,
                        created_at=result[4], sort_order=result[5]
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
                    UPDATE task_priorities SET name = %s, description = %s, color_code = %s
                    WHERE id = %s
                    RETURNING id, name, description, color_code, created_at
                """, (
                    priority_data.name, priority_data.description,
                    priority_data.color_code, priority_id
                ))
                
                result = cur.fetchone()
                if result:
                    return TaskPriorityOut(
                        id=result[0], name=result[1], description=result[2],
                        color_code=result[3], is_active=priority_data.is_active,
                        created_at=result[4]
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
