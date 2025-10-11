from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, Enum as SQLEnum, ForeignKey, Float, JSON
from sqlalchemy.orm import declarative_base, relationship
import enum

Base = declarative_base()


class TaskStatus(str, enum.Enum):
    """Task status enumeration"""
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class TaskPriority(str, enum.Enum):
    """Task priority enumeration"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class LabelingStatus(str, enum.Enum):
    """Labeling status enumeration"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class LabelCategory(str, enum.Enum):
    """Label category enumeration"""
    LOCATION = "location"
    TIME = "time"
    ENERGY = "energy"
    DURATION = "duration"
    MOOD = "mood"
    CATEGORY = "category"
    PREREQUISITES = "prerequisites"
    CONTEXT = "context"
    TOOLS = "tools"
    PEOPLE = "people"
    WEATHER = "weather"
    OTHER = "other"


class Task(Base):
    """Task model for storing task information"""
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    status = Column(SQLEnum(TaskStatus, native_enum=False, length=50), default=TaskStatus.TODO, nullable=False, index=True)
    priority = Column(SQLEnum(TaskPriority, native_enum=False, length=50), default=TaskPriority.MEDIUM, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)
    due_date = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    # Labeling metadata
    labeling_status = Column(SQLEnum(LabelingStatus, native_enum=False, length=50), default=LabelingStatus.PENDING, nullable=False, index=True)
    labeling_attempted_at = Column(DateTime, nullable=True)
    labeling_completed_at = Column(DateTime, nullable=True)
    labeling_error = Column(Text, nullable=True)

    # Pinecone vector ID for semantic search
    vector_id = Column(String(255), nullable=True, unique=True, index=True)

    # Embedding metadata
    embedding_model = Column(String(100), nullable=True)
    embedding_version = Column(String(50), nullable=True)

    # Relationships
    labels = relationship("TaskLabel", back_populates="task", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Task(id={self.id}, title='{self.title}', status='{self.status}', labeling_status='{self.labeling_status}')>"


class TaskLabel(Base):
    """Task label model with confidence scores and metadata"""
    __tablename__ = "task_labels"

    id = Column(Integer, primary_key=True, index=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False, index=True)

    # Label information
    label_name = Column(String(100), nullable=False, index=True)
    label_category = Column(SQLEnum(LabelCategory, native_enum=False, length=50), nullable=False, index=True)
    confidence_score = Column(Float, nullable=False)

    # Label metadata
    is_primary = Column(Boolean, default=False, nullable=False)  # Top labels to display
    is_user_edited = Column(Boolean, default=False, nullable=False)  # User manually edited
    original_label = Column(String(100), nullable=True)  # Original AI-generated label if edited

    # Additional context from LLM
    reasoning = Column(Text, nullable=True)  # Why this label was assigned
    label_metadata = Column(JSON, nullable=True)  # Additional structured data

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    task = relationship("Task", back_populates="labels")

    def __repr__(self):
        return f"<TaskLabel(id={self.id}, task_id={self.task_id}, label='{self.label_name}', category='{self.label_category}', confidence={self.confidence_score:.2f})>"
