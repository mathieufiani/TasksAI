"""
Task recommendation endpoints
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.schemas.recommendation import UserContextMessage, RecommendationResponse
from app.services.recommendation_service import recommendation_service
from app.core.auth import get_current_user

router = APIRouter()


@router.post("/", response_model=RecommendationResponse)
async def get_task_recommendations(
    user_message: UserContextMessage,
    top_k: int = Query(3, ge=1, le=10, description="Number of recommendations to return"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get task recommendations based on user's current context (requires authentication, user-isolated)

    The user describes their current situation (location, energy, mood, available time, etc.)
    and the system recommends the most suitable tasks from their task list.
    """
    return await recommendation_service.recommend_tasks(user_message, db, current_user.id, top_k)
