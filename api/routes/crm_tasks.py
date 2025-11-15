# CRM Task Management API Routes
from fastapi import APIRouter, HTTPException, Depends, Query
from typing import List, Optional
from uuid import UUID
from datetime import datetime
from ..schemas.crm import (
    TaskCreate, TaskUpdate, TaskOut, TaskPriorityCreate, TaskPriorityOut,
    TaskStatusCreate, TaskStatusOut, TaskDashboard
)
from ..schemas.user import UserOut
from ..core.auth import get_current_user, require_admin
from ..repositories.crm_tasks import (
    create_task, get_task, update_task, delete_task, list_tasks,
    create_task_priority, get_task_priorities, update_task_priority, delete_task_priority,
    create_task_status, get_task_statuses, update_task_status, delete_task_status,
    get_task_dashboard, get_user_tasks, complete_task
)
import logging

task_router = APIRouter(prefix="/crm/tasks", tags=["crm-tasks"])

# ==============================================
# TASK MANAGEMENT ENDPOINTS
# ==============================================

@task_router.post("/", response_model=TaskOut)
def create_new_task(
    task: TaskCreate,
    current_user: UserOut = Depends(get_current_user)
):
    """Create a new task"""
    try:
        return create_task(task, current_user.id)
    except Exception as e:
        logging.error(f"Error creating task: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to create task")

@task_router.get("", response_model=List[TaskOut])
@task_router.get("/", response_model=List[TaskOut])
def get_all_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    assigned_to: Optional[UUID] = Query(None),
    priority: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    due_at_from: Optional[datetime] = Query(None),
    due_at_to: Optional[datetime] = Query(None),
    related_type: Optional[str] = Query(None),
    related_id: Optional[UUID] = Query(None),
    search: Optional[str] = Query(None),
    current_user: UserOut = Depends(get_current_user)
):
    """Get all tasks with optional filtering"""
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
        
        return list_tasks(
            skip=skip, limit=limit, owner_user_id=assigned_to,
            priority=priority_enum, status=status_enum,
            due_at_from=due_at_from, due_at_to=due_at_to,
            related_type=related_type, related_id=related_id,
            search=search
        )
    except Exception as e:
        logging.error(f"Error fetching tasks: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to fetch tasks")

@task_router.get("/dashboard", response_model=List[TaskDashboard])
def get_task_dashboard_view(
    current_user: UserOut = Depends(get_current_user)
):
    """Get task dashboard view"""
    try:
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
    """Get a specific task by ID"""
    try:
        task = get_task(task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
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
    current_user: UserOut = Depends(get_current_user)
):
    """Update a specific task"""
    try:
        updated_task = update_task(task_id, task_update, current_user.id)
        if not updated_task:
            raise HTTPException(status_code=404, detail="Task not found")
        return updated_task
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to update task")

@task_router.patch("/{task_id}/complete")
def complete_task_by_id(
    task_id: UUID,
    current_user: UserOut = Depends(get_current_user)
):
    """Mark a task as completed"""
    try:
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
    current_user: UserOut = Depends(require_admin)
):
    """Delete a specific task (admin only)"""
    try:
        success = delete_task(task_id)
        if not success:
            raise HTTPException(status_code=404, detail="Task not found")
        return {"message": "Task deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error deleting task {task_id}: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to delete task")
