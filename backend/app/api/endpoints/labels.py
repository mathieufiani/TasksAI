from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db import get_db
from app.models.task import Task, TaskLabel, LabelCategory
from app.models.user import User
from app.schemas.label import (
    LabelResponse, LabelUpdate, LabelingStatusResponse
)
from app.services.background_tasks import background_labeling_service
from app.core.auth import get_current_user

router = APIRouter()


@router.get("/task/{task_id}", response_model=List[LabelResponse])
def get_task_labels(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all labels for a specific task (requires authentication, user-isolated)"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    return task.labels


@router.get("/task/{task_id}/primary", response_model=List[LabelResponse])
def get_task_primary_labels(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get primary labels for a specific task (requires authentication, user-isolated)"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    primary_labels = db.query(TaskLabel).filter(
        TaskLabel.task_id == task_id,
        TaskLabel.is_primary == True
    ).all()

    return primary_labels


@router.get("/task/{task_id}/status", response_model=LabelingStatusResponse)
def get_labeling_status(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get labeling status for a task (requires authentication, user-isolated)"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    primary_labels = db.query(TaskLabel).filter(
        TaskLabel.task_id == task_id,
        TaskLabel.is_primary == True
    ).all()

    return LabelingStatusResponse(
        task_id=task.id,
        labeling_status=task.labeling_status,
        labeling_attempted_at=task.labeling_attempted_at,
        labeling_completed_at=task.labeling_completed_at,
        labeling_error=task.labeling_error,
        labels_count=len(task.labels),
        primary_labels=[LabelResponse.model_validate(label) for label in primary_labels]
    )


@router.put("/{label_id}", response_model=LabelResponse)
def update_label(
    label_id: int,
    label_update: LabelUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a specific label (for user edits) (requires authentication, user-isolated)"""
    # Get label with task relationship to verify user ownership
    label = db.query(TaskLabel).join(Task).filter(
        TaskLabel.id == label_id,
        Task.user_id == current_user.id
    ).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")

    # Store original label if this is the first edit
    if not label.is_user_edited:
        label.original_label = label.label_name
        label.is_user_edited = True

    # Update fields
    update_data = label_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(label, field, value)

    db.commit()
    db.refresh(label)
    return label


@router.delete("/{label_id}", status_code=204)
def delete_label(
    label_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete a specific label (requires authentication, user-isolated)"""
    # Get label with task relationship to verify user ownership
    label = db.query(TaskLabel).join(Task).filter(
        TaskLabel.id == label_id,
        Task.user_id == current_user.id
    ).first()
    if not label:
        raise HTTPException(status_code=404, detail="Label not found")

    db.delete(label)
    db.commit()
    return None


@router.post("/task/{task_id}/re-label", status_code=202)
async def trigger_re_labeling(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Manually trigger re-labeling for a task (requires authentication, user-isolated)"""
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    # Trigger background labeling
    await background_labeling_service.re_label_task(task_id)

    return {
        "message": "Re-labeling triggered",
        "task_id": task_id
    }


@router.get("/search/by-label")
def search_tasks_by_label(
    label_names: Optional[List[str]] = Query(None, description="Filter by label names"),
    categories: Optional[List[LabelCategory]] = Query(None, description="Filter by categories"),
    min_confidence: Optional[float] = Query(None, ge=0.0, le=1.0),
    primary_only: bool = Query(False, description="Only primary labels"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Search for tasks by labels (requires authentication, user-isolated)"""
    query = db.query(Task).join(TaskLabel).filter(Task.user_id == current_user.id)

    if label_names:
        query = query.filter(TaskLabel.label_name.in_(label_names))

    if categories:
        query = query.filter(TaskLabel.label_category.in_(categories))

    if min_confidence is not None:
        query = query.filter(TaskLabel.confidence_score >= min_confidence)

    if primary_only:
        query = query.filter(TaskLabel.is_primary == True)

    tasks = query.distinct().all()

    return {
        "count": len(tasks),
        "tasks": [
            {
                "id": task.id,
                "title": task.title,
                "priority": task.priority.value,
                "status": task.status.value,
                "labeling_status": task.labeling_status.value
            }
            for task in tasks
        ]
    }


@router.get("/statistics")
def get_label_statistics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get statistics about labels in the system (requires authentication, user-isolated)"""
    from sqlalchemy import func

    # Total labels for current user's tasks
    total_labels = db.query(func.count(TaskLabel.id))\
        .join(Task)\
        .filter(Task.user_id == current_user.id)\
        .scalar()

    # Labels by category for current user's tasks
    by_category = db.query(
        TaskLabel.label_category,
        func.count(TaskLabel.id).label('count')
    ).join(Task)\
     .filter(Task.user_id == current_user.id)\
     .group_by(TaskLabel.label_category).all()

    # Most common labels for current user's tasks
    most_common = db.query(
        TaskLabel.label_name,
        TaskLabel.label_category,
        func.count(TaskLabel.id).label('count'),
        func.avg(TaskLabel.confidence_score).label('avg_confidence')
    ).join(Task)\
     .filter(Task.user_id == current_user.id)\
     .group_by(TaskLabel.label_name, TaskLabel.label_category)\
     .order_by(func.count(TaskLabel.id).desc())\
     .limit(20).all()

    return {
        "total_labels": total_labels,
        "by_category": {
            category.value: count for category, count in by_category
        },
        "most_common_labels": [
            {
                "label_name": name,
                "category": category.value,
                "count": count,
                "avg_confidence": float(avg_conf)
            }
            for name, category, count, avg_conf in most_common
        ]
    }
