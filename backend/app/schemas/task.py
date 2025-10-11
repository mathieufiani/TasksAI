from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from pydantic import BaseModel, Field, ConfigDict
from app.models.task import TaskStatus, TaskPriority, LabelingStatus

if TYPE_CHECKING:
    from app.schemas.label import LabelResponse


class TaskBase(BaseModel):
    """Base schema for Task with common attributes"""
    title: str = Field(..., min_length=1, max_length=255, description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    status: TaskStatus = Field(default=TaskStatus.TODO, description="Task status")
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM, description="Task priority")
    due_date: Optional[datetime] = Field(None, description="Task due date")


class TaskCreate(TaskBase):
    """Schema for creating a new task"""
    pass


class TaskUpdate(BaseModel):
    """Schema for updating an existing task"""
    title: Optional[str] = Field(None, min_length=1, max_length=255, description="Task title")
    description: Optional[str] = Field(None, description="Task description")
    status: Optional[TaskStatus] = Field(None, description="Task status")
    priority: Optional[TaskPriority] = Field(None, description="Task priority")
    due_date: Optional[datetime] = Field(None, description="Task due date")
    is_active: Optional[bool] = Field(None, description="Task active status")


class TaskResponse(TaskBase):
    """Schema for task responses"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime] = None
    labeling_status: LabelingStatus
    vector_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class TaskWithLabelsResponse(TaskResponse):
    """Schema for task responses with labels included"""
    labels: List['LabelResponse'] = []
    primary_labels: List['LabelResponse'] = []

    model_config = ConfigDict(from_attributes=True)


class TaskList(BaseModel):
    """Schema for paginated task list"""
    tasks: List[TaskResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
