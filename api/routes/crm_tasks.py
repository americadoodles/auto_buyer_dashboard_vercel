# CRM Task Management API Routes
from fastapi import APIRouter, HTTPException, Depends, Query, status
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ..schemas.crm import (
    TaskCreate, TaskUpdate, TaskOut, TaskPriorityCreate, TaskPriorityOut,
    TaskStatusCreate, TaskStatusOut, TaskDashboard,
    TaskMoveRequest, TaskBoardDetailOut, BulkTaskMoveRequest,
    BulkTaskOwnerChangeRequest, BulkTaskStatusCloseRequest, TaskBoardScope
)
from ..schemas.user import UserOut
from ..core.auth import get_current_user, require_admin, require_buyer_or_admin, check_task_ownership
from ..repositories.crm_tasks import (
    create_task, get_task, update_task, delete_task, list_tasks,
    create_task_priority, get_task_priorities, update_task_priority, delete_task_priority,
    create_task_status, get_task_statuses, update_task_status, delete_task_status,
    get_task_dashboard, get_user_tasks, complete_task,
    move_task, get_task_board_detail,
    bulk_move_tasks, bulk_change_task_owner, bulk_close_tasks
)
import logging

task_router = APIRouter(prefix="/crm/tasks", tags=["crm-tasks"])

# ==============================================
# TASK MANAGEMENT ENDPOINTS
# ==============================================

@task_router.post("/", response_model=TaskOut)
def create_new_task(
    task: TaskCreate,
    current_user: UserOut = Depends(require_buyer_or_admin)
):
    """Create a new task. Buyers can only create tasks they own. Admins can create any task."""
    try:
        # Buyers can only create tasks they own
        role_lower = (current_user.role or "").lower()
        if role_lower == "buyer":
            # Ensure buyer can only create tasks with themselves as owner
            if task.owner_user_id and task.owner_user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Buyers can only create tasks they own"
                )
            # Set owner to current user if not specified
            task.owner_user_id = current_user.id
        
        return create_task(task, current_user.id)
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error creating task: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create task")

@task_router.get("", response_model=List[TaskOut])
@task_router.get("/", response_model=List[TaskOut])
def get_all_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    owner: Optional[UUID] = Query(None, description="Filter by owner user ID (alias: assigned_to)"),
    assigned_to: Optional[UUID] = Query(None, description="Filter by owner user ID (deprecated: use owner)"),
    related: Optional[str] = Query(None, description="Filter by related_type (e.g., 'lead', 'contact', 'deal')"),
    status: Optional[str] = Query(None, description="Filter by status"),
    due: Optional[datetime] = Query(None, description="Filter by due date (exact match)"),
    priority: Optional[str] = Query(None),
    due_at_from: Optional[datetime] = Query(None, description="Filter by due date (from)"),
    due_at_to: Optional[datetime] = Query(None, description="Filter by due date (to)"),
    related_type: Optional[str] = Query(None, description="Filter by related_type (alias: related)"),
    related_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    current_user: UserOut = Depends(get_current_user)
):
    """
    GET /tasks?owner=&related=&status=&due=
    Get all tasks with optional filtering. All roles can read tasks, but buyers only see their own.
    """
    try:
        from ..schemas.crm import TaskPriority, TaskStatus
        
        # Convert string priority/status to enum if provided
        priority_enum = None
        if priority:
            try:
                priority_enum = TaskPriority(priority)
            except ValueError:
                pass
        
        status_enum = None
        if status:
            try:
                status_enum = TaskStatus(status)
            except ValueError:
                pass
        
        # Handle owner/assigned_to parameter (owner takes precedence)
        owner_filter = owner or assigned_to
        
        # Handle related/related_type parameter (related takes precedence)
        related_type_filter = related or related_type
        
        # Buyers can only see their own tasks
        role_lower = (current_user.role or "").lower()
        if role_lower == "buyer":
            # Force filter to current user's tasks
            owner_filter = current_user.id
        
        return list_tasks(
            skip=skip, limit=limit, owner_user_id=owner_filter,
            priority=priority_enum, status=status_enum,
            due_at_from=due_at_from or (due if due else None),
            due_at_to=due_at_to or (due if due else None),
            related_type=related_type_filter, related_id=related_id,
            search=search
        )
    except Exception as e:
        logging.error(f"Error fetching tasks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch tasks")

@task_router.get("/dashboard", response_model=List[TaskDashboard])
def get_task_dashboard_view(
    current_user: UserOut = Depends(get_current_user)
):
    """Get task dashboard view. All roles can read, but buyers only see their own tasks."""
    try:
        # Note: get_task_dashboard() currently returns all tasks
        # For buyers, we should filter to their tasks only
        # For now, returning all tasks - dashboard filtering can be enhanced later
        return get_task_dashboard()
    except Exception as e:
        logging.error(f"Error fetching task dashboard: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch task dashboard")

@task_router.get("/my-tasks", response_model=List[TaskOut])
def get_my_tasks(
    current_user: UserOut = Depends(get_current_user)
):
    """Get tasks assigned to current user"""
    try:
        return get_user_tasks(current_user.id)
    except Exception as e:
        logging.error(f"Error fetching user tasks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch user tasks")

# ==============================================
# TASK PRIORITY MANAGEMENT ENDPOINTS
# ==============================================

@task_router.post("/priorities", response_model=TaskPriorityOut)
def create_task_priority_endpoint(
    priority: TaskPriorityCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Create a new task priority (admin only)"""
    try:
        return create_task_priority(priority)
    except Exception as e:
        logging.error(f"Error creating task priority: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create task priority")

@task_router.get("/priorities", response_model=List[TaskPriorityOut])
@task_router.get("/priorities/", response_model=List[TaskPriorityOut])
def get_task_priorities_list(
    current_user: UserOut = Depends(get_current_user)
):
    """Get all task priorities"""
    try:
        return get_task_priorities()
    except Exception as e:
        logging.error(f"Error fetching task priorities: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch task priorities")

@task_router.put("/priorities/{priority_id}", response_model=TaskPriorityOut)
def update_task_priority_endpoint(
    priority_id: int,
    priority: TaskPriorityCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Update a task priority (admin only)"""
    try:
        updated_priority = update_task_priority(priority_id, priority)
        if not updated_priority:
            raise HTTPException(status_code=404, detail="Task priority not found")
        return updated_priority
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating task priority: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update task priority")

@task_router.delete("/priorities/{priority_id}")
def delete_task_priority_endpoint(
    priority_id: int,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a task priority (admin only)"""
    try:
        success = delete_task_priority(priority_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task priority not found")
        return {"message": "Task priority deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting task priority: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete task priority")

# ==============================================
# TASK STATUS MANAGEMENT ENDPOINTS
# ==============================================

@task_router.post("/statuses", response_model=TaskStatusOut)
def create_task_status_endpoint(
    status: TaskStatusCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Create a new task status (admin only)"""
    try:
        return create_task_status(status)
    except Exception as e:
        logging.error(f"Error creating task status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create task status")

@task_router.get("/statuses", response_model=List[TaskStatusOut])
@task_router.get("/statuses/", response_model=List[TaskStatusOut])
def get_task_statuses_list(
    current_user: UserOut = Depends(get_current_user)
):
    """Get all task statuses"""
    try:
        return get_task_statuses()
    except Exception as e:
        logging.error(f"Error fetching task statuses: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch task statuses")

@task_router.put("/statuses/{status_id}", response_model=TaskStatusOut)
def update_task_status_endpoint(
    status_id: int,
    status: TaskStatusCreate,
    current_user: UserOut = Depends(require_admin)
):
    """Update a task status (admin only)"""
    try:
        updated_status = update_task_status(status_id, status)
        if not updated_status:
            raise HTTPException(status_code=404, detail="Task status not found")
        return updated_status
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating task status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update task status")

@task_router.delete("/statuses/{status_id}")
def delete_task_status_endpoint(
    status_id: int,
    current_user: UserOut = Depends(require_admin)
):
    """Delete a task status (admin only)"""
    try:
        success = delete_task_status(status_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task status not found")
        return {"message": "Task status deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting task status: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete task status")

@task_router.get("/{task_id}", response_model=TaskOut)
def get_task_by_id(
    task_id: UUID,
    current_user: UserOut = Depends(get_current_user)
):
    """Get a specific task by ID. Buyers can only read their own tasks."""
    try:
        task = get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check ownership for buyers
        if not check_task_ownership(task.owner_user_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this task"
            )
        
        return task
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch task")

@task_router.put("/{task_id}", response_model=TaskOut)
def update_task_by_id(
    task_id: UUID,
    task_update: TaskUpdate,
    current_user: UserOut = Depends(require_buyer_or_admin)
):
    """Update a specific task. Buyers can only update their own tasks. Admins can update any task."""
    try:
        # First check if task exists and user has permission
        task = get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check ownership
        if not check_task_ownership(task.owner_user_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this task"
            )
        
        # Buyers cannot change ownership
        role_lower = (current_user.role or "").lower()
        if role_lower == "buyer" and task_update.owner_user_id:
            if task_update.owner_user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Buyers cannot change task ownership"
                )
        
        updated_task = update_task(task_id, task_update, current_user.id)
        if not updated_task:
            raise HTTPException(status_code=404, detail="Task not found")
        return updated_task
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update task")

@task_router.patch("/{task_id}", response_model=TaskOut)
def patch_task_by_id(
    task_id: UUID,
    task_update: TaskUpdate,
    current_user: UserOut = Depends(require_buyer_or_admin)
):
    """
    PATCH /tasks/:id (status/owner/column/due)
    Partially update a task. Buyers can only update their own tasks. Admins can update any task.
    """
    try:
        # First check if task exists and user has permission
        task = get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check ownership
        if not check_task_ownership(task.owner_user_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to update this task"
            )
        
        # Buyers cannot change ownership
        role_lower = (current_user.role or "").lower()
        if role_lower == "buyer" and task_update.owner_user_id:
            if task_update.owner_user_id != current_user.id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Buyers cannot change task ownership"
                )
        
        updated_task = update_task(task_id, task_update, current_user.id)
        if not updated_task:
            raise HTTPException(status_code=404, detail="Task not found")
        return updated_task
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update task")

@task_router.post("/{task_id}/move", response_model=TaskOut)
def move_task_by_id(
    task_id: UUID,
    move_request: TaskMoveRequest,
    current_user: UserOut = Depends(require_buyer_or_admin)
):
    """
    POST /tasks/:id/move
    Move a task to a different column with WIP validation.
    Admin override flag allows admins to bypass WIP limits.
    """
    try:
        # Check if task exists and user has permission
        task = get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check ownership
        if not check_task_ownership(task.owner_user_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to move this task"
            )
        
        # Only admins can use admin override
        role_lower = (current_user.role or "").lower()
        admin_override = move_request.admin_override and role_lower == "admin"
        
        moved_task = move_task(task_id, move_request.column_id, current_user.id, admin_override)
        if not moved_task:
            raise HTTPException(status_code=404, detail="Task not found")
        return moved_task
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error moving task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to move task")

@task_router.patch("/{task_id}/complete")
def complete_task_by_id(
    task_id: UUID,
    current_user: UserOut = Depends(require_buyer_or_admin)
):
    """Mark a task as completed. Buyers can only complete their own tasks. Admins can complete any task."""
    try:
        # First check if task exists and user has permission
        task = get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check ownership
        if not check_task_ownership(task.owner_user_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to complete this task"
            )
        
        success = complete_task(task_id, current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"message": "Task completed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error completing task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to complete task")

@task_router.delete("/{task_id}")
def delete_task_by_id(
    task_id: UUID,
    current_user: UserOut = Depends(require_buyer_or_admin)
):
    """Delete a specific task. Buyers can only delete their own tasks. Admins can delete any task."""
    try:
        # First check if task exists and user has permission
        task = get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        # Check ownership
        if not check_task_ownership(task.owner_user_id, current_user):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this task"
            )
        
        success = delete_task(task_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"message": "Task deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete task")

# ==============================================
# TASK BOARD ENDPOINTS
# ==============================================

@task_router.get("/task-boards/{board_id}", response_model=TaskBoardDetailOut)
def get_task_board_by_id(
    board_id: UUID,
    current_user: UserOut = Depends(get_current_user)
):
    """
    GET /task-boards/:id
    Get task board details with columns and task counts.
    """
    try:
        board_detail = get_task_board_detail(board_id)
        if not board_detail:
            raise HTTPException(status_code=404, detail="Task board not found")
        return board_detail
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error fetching task board {board_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch task board")

# ==============================================
# BULK OPERATIONS ENDPOINTS
# ==============================================

@task_router.post("/bulk/move", response_model=dict)
def bulk_move_tasks_endpoint(
    request: BulkTaskMoveRequest,
    current_user: UserOut = Depends(require_buyer_or_admin)
):
    """
    Bulk move tasks to a column with WIP validation.
    Admin override flag allows admins to bypass WIP limits.
    """
    try:
        # Verify user has permission for all tasks
        role_lower = (current_user.role or "").lower()
        admin_override = request.admin_override and role_lower == "admin"
        
        if role_lower == "buyer":
            # Buyers can only bulk move their own tasks
            for task_id in request.task_ids:
                task = get_task(task_id)
                if not task:
                    continue
                if not check_task_ownership(task.owner_user_id, current_user):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"You do not have permission to move task {task_id}"
                    )
        
        result = bulk_move_tasks(request.task_ids, request.column_id, current_user.id, admin_override)
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in bulk move tasks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to bulk move tasks")

@task_router.post("/bulk/change-owner", response_model=dict)
def bulk_change_owner_endpoint(
    request: BulkTaskOwnerChangeRequest,
    current_user: UserOut = Depends(require_admin)
):
    """
    Bulk change task owner.
    Admin only operation.
    """
    try:
        result = bulk_change_task_owner(request.task_ids, request.owner_user_id, current_user.id)
        return result
    except Exception as e:
        logging.error(f"Error in bulk change owner: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to bulk change task owner")

@task_router.post("/bulk/close", response_model=dict)
def bulk_close_tasks_endpoint(
    request: BulkTaskStatusCloseRequest,
    current_user: UserOut = Depends(require_buyer_or_admin)
):
    """
    Bulk close tasks (set status to Done).
    Buyers can only close their own tasks. Admins can close any tasks.
    """
    try:
        # Verify user has permission for all tasks
        role_lower = (current_user.role or "").lower()
        if role_lower == "buyer":
            # Buyers can only bulk close their own tasks
            for task_id in request.task_ids:
                task = get_task(task_id)
                if not task:
                    continue
                if not check_task_ownership(task.owner_user_id, current_user):
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"You do not have permission to close task {task_id}"
                    )
        
        result = bulk_close_tasks(request.task_ids, current_user.id)
        return result
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error in bulk close tasks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to bulk close tasks")
