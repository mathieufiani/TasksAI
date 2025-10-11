"""
Background task processing for async labeling operations

Uses FastAPI's BackgroundTasks to handle labeling asynchronously.
For production, consider using Celery, RQ, or similar task queue.
"""

import asyncio
from datetime import datetime
from typing import Optional
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.task import Task, TaskLabel, LabelingStatus
from app.schemas.label import TaskLabelingInput, UserContext
from app.agents.labeling_agent import LabelingAgent
from app.services.pinecone_service import PineconeService
from app.core.config import settings


class BackgroundLabelingService:
    """Service to handle background labeling tasks"""

    def __init__(self):
        self.labeling_agent = LabelingAgent()
        self.pinecone_service = PineconeService()

    async def process_task_labeling(
        self,
        task_id: int,
        user_context: Optional[UserContext] = None
    ):
        """
        Process labeling for a task in the background

        Args:
            task_id: ID of the task to label
            user_context: Optional user context for better labeling
        """
        db = SessionLocal()
        try:
            # Get the task
            task = db.query(Task).filter(Task.id == task_id).first()
            if not task:
                print(f"Task {task_id} not found for labeling")
                return

            # Update status to in_progress
            task.labeling_status = LabelingStatus.IN_PROGRESS
            task.labeling_attempted_at = datetime.utcnow()
            db.commit()

            # Prepare input for labeling agent
            labeling_input = TaskLabelingInput(
                task_id=task.id,
                title=task.title,
                description=task.description,
                priority=task.priority.value,
                due_date=task.due_date,
                user_context=user_context or UserContext()
            )

            # Generate labels using AI agent
            labeling_output = await self.labeling_agent.generate_labels(labeling_input)

            # Validate labels
            if not await self.labeling_agent.validate_labels(labeling_output.labels):
                raise ValueError("Generated labels did not meet validation requirements")

            # Delete existing labels if re-labeling
            db.query(TaskLabel).filter(TaskLabel.task_id == task_id).delete()

            # Sort labels by confidence and mark top ones as primary
            sorted_labels = sorted(
                labeling_output.labels,
                key=lambda x: x.confidence,
                reverse=True
            )

            # Save labels to database
            for idx, generated_label in enumerate(sorted_labels):
                task_label = TaskLabel(
                    task_id=task.id,
                    label_name=generated_label.label_name,
                    label_category=generated_label.category,
                    confidence_score=generated_label.confidence,
                    is_primary=(idx < 5),  # Top 5 labels are primary
                    reasoning=generated_label.reasoning,
                    label_metadata={
                        "external_factors": labeling_output.external_factors_considered,
                        "summary": labeling_output.summary
                    }
                )
                db.add(task_label)

            # Update task status to completed (labels are saved successfully)
            task.labeling_status = LabelingStatus.COMPLETED
            task.labeling_completed_at = datetime.utcnow()
            task.labeling_error = None

            db.commit()
            print(f"✓ Task {task_id} labeled successfully with {len(labeling_output.labels)} labels")

            # Try to generate and store embedding in Pinecone (non-critical, don't fail if this errors)
            try:
                await self.pinecone_service.upsert_task_embedding(
                    task=task,
                    labels=labeling_output.labels,
                    db=db
                )
                print(f"✓ Task {task_id} embedding stored in Pinecone")
            except Exception as pinecone_error:
                # Log error but don't fail the labeling process
                print(f"⚠ Warning: Failed to store embedding in Pinecone for task {task_id}: {str(pinecone_error)}")
                # Update task with warning but keep status as completed
                task.labeling_error = f"Labels created but Pinecone failed: {str(pinecone_error)[:200]}"
                db.commit()

        except Exception as e:
            # Handle errors
            print(f"✗ Error labeling task {task_id}: {str(e)}")
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                task.labeling_status = LabelingStatus.FAILED
                task.labeling_error = str(e)[:500]  # Truncate error message
                db.commit()

        finally:
            db.close()

    async def re_label_task(
        self,
        task_id: int,
        user_context: Optional[UserContext] = None
    ):
        """
        Re-label a task (same as process_task_labeling but explicit naming)

        Args:
            task_id: ID of the task to re-label
            user_context: Optional updated user context
        """
        await self.process_task_labeling(task_id, user_context)


# Global instance
background_labeling_service = BackgroundLabelingService()


# Synchronous wrapper for FastAPI BackgroundTasks
def label_task_background(task_id: int, user_context: Optional[dict] = None):
    """
    Synchronous wrapper to be used with FastAPI BackgroundTasks

    Args:
        task_id: ID of the task to label
        user_context: Optional user context as dict
    """
    # Convert dict to UserContext if provided
    context = UserContext(**user_context) if user_context else None

    # Run async function
    asyncio.run(background_labeling_service.process_task_labeling(task_id, context))
