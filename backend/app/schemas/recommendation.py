"""
Schemas for task recommendation based on user context
"""

from typing import List, Optional
from pydantic import BaseModel, Field


class UserContextMessage(BaseModel):
    """User's current context/feeling message"""
    message: str = Field(..., min_length=1, description="User's description of their current state")


class ExtractedContext(BaseModel):
    """Extracted labels from user message"""
    location: Optional[str] = Field(None, description="Inferred location (e.g., 'home', 'office')")
    time_of_day: Optional[str] = Field(None, description="Time context (e.g., 'morning', 'evening')")
    energy_level: Optional[str] = Field(None, description="Energy level (e.g., 'high-energy', 'low-energy')")
    mood: Optional[str] = Field(None, description="Current mood (e.g., 'focused', 'creative')")
    duration_available: Optional[str] = Field(None, description="Available time (e.g., 'quick-5min', 'long-2hr')")
    other_labels: List[str] = Field(default_factory=list, description="Other relevant labels")


class TaskRecommendation(BaseModel):
    """Recommended task with match score"""
    task_id: int
    title: str
    description: Optional[str] = None
    priority: str
    match_score: float = Field(..., ge=0.0, le=1.0, description="Match score (0-1)")
    matching_labels: List[str] = Field(..., description="Labels that matched user context")
    reasoning: str = Field(..., description="Why this task is recommended")


class TaskSuggestion(BaseModel):
    """AI-generated task suggestion"""
    title: str = Field(..., min_length=1, description="Suggested task title")
    description: Optional[str] = Field(None, description="Suggested task description")
    suggested_priority: str = Field(..., description="Suggested priority (low, medium, high)")
    suggested_due_date: Optional[str] = Field(None, description="Optional suggested due date (ISO format)")
    suggested_labels: List[str] = Field(default_factory=list, description="Suggested labels for the task")
    reasoning: str = Field(..., description="Why this task is suggested")


class RecommendationResponse(BaseModel):
    """Response with recommended tasks and AI-generated suggestions"""
    user_context: ExtractedContext
    recommendations: List[TaskRecommendation]
    suggestions: List[TaskSuggestion] = Field(default_factory=list, description="AI-generated task suggestions")
    message: str = Field(..., description="Natural language response to user")
