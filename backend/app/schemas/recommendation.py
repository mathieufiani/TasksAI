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


class RecommendationResponse(BaseModel):
    """Response with recommended tasks"""
    user_context: ExtractedContext
    recommendations: List[TaskRecommendation]
    message: str = Field(..., description="Natural language response to user")
