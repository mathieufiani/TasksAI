from fastapi import APIRouter, Depends, HTTPException, Query, BackgroundTasks
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from datetime import datetime

from app.db import get_db
from app.models.task import Task, TaskStatus, TaskPriority
from app.schemas.task import TaskCreate, TaskUpdate, TaskResponse, TaskList
from app.services.background_tasks import label_task_background

router = APIRouter()


@router.post("/", response_model=TaskResponse, status_code=201)
def create_task(
    task: TaskCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a new task and trigger async labeling"""
    db_task = Task(
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)

    # Trigger background labeling
    background_tasks.add_task(label_task_background, db_task.id)

    return db_task


@router.get("/", response_model=TaskList)
def list_tasks(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(10, ge=1, le=100, description="Items per page"),
    status: Optional[TaskStatus] = Query(None, description="Filter by status"),
    priority: Optional[TaskPriority] = Query(None, description="Filter by priority"),
    is_active: Optional[bool] = Query(True, description="Filter by active status (default: True)"),
    search: Optional[str] = Query(None, description="Search in title and description"),
    db: Session = Depends(get_db)
):
    """List tasks with pagination and filters"""
    query = db.query(Task)

    # Apply filters - by default only show active tasks
    if status:
        query = query.filter(Task.status == status)
    if priority:
        query = query.filter(Task.priority == priority)
    if is_active is not None:
        query = query.filter(Task.is_active == is_active)
    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            (Task.title.ilike(search_filter)) |
            (Task.description.ilike(search_filter))
        )

    # Get total count
    total = query.count()

    # Apply pagination
    offset = (page - 1) * page_size
    tasks = query.order_by(Task.created_at.desc()).offset(offset).limit(page_size).all()

    # Calculate total pages
    total_pages = (total + page_size - 1) // page_size

    return TaskList(
        tasks=tasks,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages
    )


@router.get("/{task_id}", response_model=TaskResponse)
def get_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    """Get a specific task by ID"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task


@router.put("/{task_id}", response_model=TaskResponse)
def update_task(
    task_id: int,
    task_update: TaskUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Update a task and trigger re-labeling"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Update fields if provided
    update_data = task_update.model_dump(exclude_unset=True)

    # Check if content changed (title or description)
    content_changed = (
        "title" in update_data or
        "description" in update_data or
        "priority" in update_data or
        "due_date" in update_data
    )

    # Handle completed_at timestamp
    if "status" in update_data and update_data["status"] == TaskStatus.COMPLETED:
        if task.status != TaskStatus.COMPLETED:
            task.completed_at = datetime.utcnow()
    elif "status" in update_data and update_data["status"] != TaskStatus.COMPLETED:
        task.completed_at = None

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)

    # Trigger re-labeling if content changed
    if content_changed:
        background_tasks.add_task(label_task_background, task.id)

    return task


@router.delete("/{task_id}", status_code=204)
def delete_task(
    task_id: int,
    hard_delete: bool = Query(False, description="Permanently delete the task"),
    db: Session = Depends(get_db)
):
    """Delete a task (soft delete by default, hard delete if specified)"""
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    if hard_delete:
        db.delete(task)
    else:
        task.is_active = False

    db.commit()
    return None


@router.get("/stats/summary")
def get_task_stats(db: Session = Depends(get_db)):
    """Get task statistics"""
    total = db.query(func.count(Task.id)).scalar()
    active = db.query(func.count(Task.id)).filter(Task.is_active == True).scalar()

    by_status = db.query(
        Task.status,
        func.count(Task.id).label('count')
    ).filter(Task.is_active == True).group_by(Task.status).all()

    by_priority = db.query(
        Task.priority,
        func.count(Task.id).label('count')
    ).filter(Task.is_active == True).group_by(Task.priority).all()

    return {
        "total": total,
        "active": active,
        "by_status": {status.value: count for status, count in by_status},
        "by_priority": {priority.value: count for priority, count in by_priority}
    }
