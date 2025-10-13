"""
Task recommendation service based on user context
Uses LLM to extract context from user message and match with task labels
"""

import json
from typing import List, Dict, Any
from sqlalchemy.orm import Session
from openai import AsyncOpenAI

from app.models.task import Task, TaskLabel, TaskStatus
from app.schemas.recommendation import (
    UserContextMessage, ExtractedContext, TaskRecommendation, TaskSuggestion, RecommendationResponse
)
from app.core.config import settings


class RecommendationService:
    """Service to recommend tasks based on user's current context"""

    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL or "gpt-4"

    async def extract_context_from_message(self, message: str) -> ExtractedContext:
        """
        Extract structured context (labels) from user's natural language message

        Args:
            message: User's description of their current state

        Returns:
            ExtractedContext with inferred labels
        """
        system_prompt = """You are a context extraction assistant. Extract structured information from the user's message about their current state.

Analyze the message and identify:
- **location**: Where they are (home, office, outdoor, gym, store, cafe, etc.)
- **time_of_day**: Current time context (early-morning, morning, afternoon, evening, night)
- **energy_level**: Their energy level (high-energy, medium-energy, low-energy, minimal-energy)
- **mood**: Their mental state (focused, creative, social, physical, reflective, motivated, etc.)
- **duration_available**: How much time they have (quick-5min, short-15min, medium-30min, standard-1hr, long-2hr, extended-4hr+)
- **other_labels**: Any other relevant context (quiet-needed, collaborative, solo, urgent, weather-dependent, etc.)

Return ONLY valid JSON in this format:
{
  "location": "string or null",
  "time_of_day": "string or null",
  "energy_level": "string or null",
  "mood": "string or null",
  "duration_available": "string or null",
  "other_labels": ["string array"]
}

Use lowercase and hyphens for all labels. If something isn't mentioned or can't be inferred, use null."""

        user_prompt = f"""Extract context from this message:

"{message}"

Return the structured context as JSON."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,
                max_tokens=500
            )

            content = response.choices[0].message.content
            parsed = json.loads(content)

            return ExtractedContext(**parsed)

        except Exception as e:
            print(f"Error extracting context: {str(e)}")
            # Return empty context on error
            return ExtractedContext()

    def calculate_label_match_score(
        self,
        task_labels: List[TaskLabel],
        user_context: ExtractedContext
    ) -> tuple[float, List[str]]:
        """
        Calculate how well task labels match user context

        Returns:
            (match_score, matching_labels)
        """
        # Collect all user context labels
        user_labels = []
        if user_context.location:
            user_labels.append(user_context.location)
        if user_context.time_of_day:
            user_labels.append(user_context.time_of_day)
        if user_context.energy_level:
            user_labels.append(user_context.energy_level)
        if user_context.mood:
            user_labels.append(user_context.mood)
        if user_context.duration_available:
            user_labels.append(user_context.duration_available)
        user_labels.extend(user_context.other_labels or [])

        if not user_labels:
            return 0.0, []

        # Collect task labels
        task_label_names = [label.label_name for label in task_labels]

        # Find exact matches
        matching_labels = []
        weighted_score = 0.0

        for user_label in user_labels:
            for task_label in task_labels:
                if user_label.lower() == task_label.label_name.lower():
                    matching_labels.append(user_label)
                    # Weight by confidence score
                    weighted_score += task_label.confidence_score

        # Calculate normalized score (0-1)
        if matching_labels:
            # Score based on:
            # 1. Number of matches (more matches = better)
            # 2. Average confidence of matching labels
            # 3. Percentage of user context that's matched
            match_percentage = len(matching_labels) / len(user_labels)
            avg_confidence = weighted_score / len(matching_labels)

            # Boost score for tasks with multiple strong matches
            match_bonus = min(0.3, len(matching_labels) * 0.1)

            # Final score: weighted combination
            match_score = min(1.0, (match_percentage * 0.4) + (avg_confidence * 0.5) + match_bonus)
        else:
            match_score = 0.0

        return match_score, matching_labels

    async def generate_task_suggestions(
        self,
        user_context: ExtractedContext,
        user_message: str,
        num_suggestions: int = 3
    ) -> List[TaskSuggestion]:
        """
        Generate new task suggestions using LLM based on user's context

        Args:
            user_context: Extracted context from user message
            user_message: Original user message
            num_suggestions: Number of suggestions to generate

        Returns:
            List of TaskSuggestion objects
        """
        system_prompt = """You are a productivity assistant that suggests new tasks based on the user's current context.

Generate personalized task suggestions that:
- Match the user's location, energy level, mood, and available time
- Are actionable and specific
- Include appropriate labels for context
- Have a suggested priority (low, medium, or high)
- Include brief reasoning for why this task is suggested

Consider the user's situation holistically and suggest tasks that would be beneficial for their productivity, wellbeing, or personal growth."""

        user_prompt = f"""Based on the user's current situation, suggest {num_suggestions} new tasks they should consider adding to their to-do list.

User said: "{user_message}"

Extracted context:
- Location: {user_context.location or 'unspecified'}
- Time of day: {user_context.time_of_day or 'unspecified'}
- Energy level: {user_context.energy_level or 'unspecified'}
- Mood: {user_context.mood or 'unspecified'}
- Time available: {user_context.duration_available or 'unspecified'}
- Other context: {', '.join(user_context.other_labels) if user_context.other_labels else 'none'}

Return ONLY valid JSON in this exact format:
{{
  "suggestions": [
    {{
      "title": "Task title",
      "description": "Brief description of what to do",
      "suggested_priority": "low|medium|high",
      "suggested_due_date": "ISO date string or null",
      "suggested_labels": ["label1", "label2"],
      "reasoning": "One sentence explaining why this task is suggested"
    }}
  ]
}}

Make the suggestions practical, achievable in the given context, and aligned with the user's current situation."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )

            content = response.choices[0].message.content
            parsed = json.loads(content)

            suggestions = []
            for suggestion_data in parsed.get('suggestions', []):
                suggestions.append(TaskSuggestion(**suggestion_data))

            return suggestions

        except Exception as e:
            print(f"Error generating task suggestions: {str(e)}")
            return []

    async def recommend_tasks(
        self,
        user_message: UserContextMessage,
        db: Session,
        top_k: int = 3
    ) -> RecommendationResponse:
        """
        Recommend tasks based on user's current context

        Args:
            user_message: User's description of current state
            db: Database session
            top_k: Number of recommendations to return

        Returns:
            RecommendationResponse with recommended tasks
        """
        # Extract context from message
        user_context = await self.extract_context_from_message(user_message.message)

        # Get all active, incomplete tasks with labels
        tasks = db.query(Task).filter(
            Task.is_active == True,
            Task.status != TaskStatus.COMPLETED
        ).all()

        # Score each task
        task_scores = []
        for task in tasks:
            if not task.labels:
                continue

            match_score, matching_labels = self.calculate_label_match_score(
                task.labels,
                user_context
            )

            if match_score > 0:
                task_scores.append({
                    'task': task,
                    'score': match_score,
                    'matching_labels': matching_labels
                })

        # Sort by score
        task_scores.sort(key=lambda x: x['score'], reverse=True)

        # Take top K
        top_tasks = task_scores[:top_k]

        # Generate reasoning using LLM
        recommendations = []
        for item in top_tasks:
            task = item['task']
            reasoning = await self._generate_reasoning(
                task,
                user_context,
                item['matching_labels']
            )

            recommendations.append(TaskRecommendation(
                task_id=task.id,
                title=task.title,
                description=task.description,
                priority=task.priority.value,
                match_score=item['score'],
                matching_labels=item['matching_labels'],
                reasoning=reasoning
            ))

        # Generate task suggestions
        suggestions = await self.generate_task_suggestions(
            user_context,
            user_message.message,
            num_suggestions=3
        )

        # Generate response message
        if recommendations or suggestions:
            response_message = await self._generate_response_message(
                user_message.message,
                user_context,
                recommendations,
                suggestions
            )
        else:
            response_message = "I couldn't find any tasks that match your current context. Try describing your situation differently, or add more tasks to your list!"

        return RecommendationResponse(
            user_context=user_context,
            recommendations=recommendations,
            suggestions=suggestions,
            message=response_message
        )

    async def _generate_reasoning(
        self,
        task: Task,
        user_context: ExtractedContext,
        matching_labels: List[str]
    ) -> str:
        """Generate natural language reasoning for why task matches"""
        prompt = f"""Explain in one sentence why this task is a good match for the user's current situation.

Task: {task.title}
User Context: {user_context.model_dump_json()}
Matching Labels: {', '.join(matching_labels)}

Write a brief, friendly explanation."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.7,
                max_tokens=100
            )
            return response.choices[0].message.content.strip()
        except:
            return f"This task matches your context with labels: {', '.join(matching_labels)}"

    async def _generate_response_message(
        self,
        user_message: str,
        context: ExtractedContext,
        recommendations: List[TaskRecommendation],
        suggestions: List[TaskSuggestion] = []
    ) -> str:
        """Generate friendly response message"""
        prompt = f"""Generate a friendly, brief response to the user based on their message and the recommended/suggested tasks.

User said: "{user_message}"
Extracted context: {context.model_dump_json()}
Number of recommendations from backlog: {len(recommendations)}
Number of new task suggestions: {len(suggestions)}

Write a natural, encouraging response (2-3 sentences max) that acknowledges their situation and introduces both the recommendations from their backlog and new task suggestions."""

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": prompt}],
                temperature=0.8,
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        except:
            parts = []
            if recommendations:
                parts.append(f"{len(recommendations)} task(s) from your backlog")
            if suggestions:
                parts.append(f"{len(suggestions)} new suggestion(s)")
            return f"Based on how you're feeling, I found {' and '.join(parts)} that might be perfect for you right now!"


# Global instance
recommendation_service = RecommendationService()
