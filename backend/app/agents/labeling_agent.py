"""
Labeling Agent using Pydantic AI and OpenAI GPT-4

This agent analyzes tasks and generates comprehensive labels based on:
- Task content (title, description)
- User context (location, timezone, preferences)
- External factors (time of day, weather, season)
- Task metadata (priority, due date)
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
import json
from pydantic import BaseModel, Field
from openai import AsyncOpenAI

from app.schemas.label import GeneratedLabel, TaskLabelingInput, TaskLabelingOutput
from app.models.task import LabelCategory
from app.core.config import settings


class LabelingAgent:
    """
    AI Agent for intelligent task labeling.

    Uses OpenAI GPT-4 to analyze tasks and generate relevant labels across multiple categories:
    - Location: home, office, outdoor, gym, store, anywhere
    - Time: morning, afternoon, evening, night, weekend, weekday
    - Energy: high-energy, medium-energy, low-energy, rest
    - Duration: quick-5min, short-15min, medium-1hr, long-2hr+
    - Mood: focused, creative, social, administrative, physical, reflective
    - Category: work, personal, health, shopping, errands, learning, entertainment
    - Prerequisites: internet, phone, computer, tools, other-people, transportation
    - Context: quiet-needed, active, collaborative, solo, urgent, flexible
    - Tools: laptop, phone, pen-paper, specific-app, physical-tools
    - People: solo, with-family, with-friends, with-colleagues, service-provider
    - Weather: indoor, outdoor, weather-dependent, any-weather
    """

    def __init__(self, api_key: Optional[str] = None):
        """Initialize the labeling agent with OpenAI API key"""
        self.api_key = api_key or settings.OPENAI_API_KEY
        self.client = AsyncOpenAI(api_key=self.api_key)
        self.model = settings.OPENAI_MODEL or "gpt-4"

    async def generate_labels(self, task_input: TaskLabelingInput) -> TaskLabelingOutput:
        """
        Generate comprehensive labels for a task using GPT-4

        Args:
            task_input: Task information and user context

        Returns:
            TaskLabelingOutput with generated labels and analysis
        """
        # Build the system prompt
        system_prompt = self._build_system_prompt()

        # Build the user prompt with task details
        user_prompt = self._build_user_prompt(task_input)

        # Call OpenAI API with structured output
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.7,
                max_tokens=2000
            )

            # Parse the response
            response_content = response.choices[0].message.content
            parsed_response = json.loads(response_content)

            # Convert to our output schema
            labels = [
                GeneratedLabel(
                    label_name=label["label_name"],
                    category=LabelCategory(label["category"]),
                    confidence=label["confidence"],
                    reasoning=label["reasoning"]
                )
                for label in parsed_response.get("labels", [])
            ]

            # Ensure minimum 6 labels
            if len(labels) < 6:
                raise ValueError(f"GPT-4 generated only {len(labels)} labels, minimum 6 required")

            return TaskLabelingOutput(
                task_id=task_input.task_id,
                labels=labels,
                summary=parsed_response.get("summary", "Task analysis completed"),
                external_factors_considered=parsed_response.get("external_factors_considered", [])
            )

        except Exception as e:
            raise Exception(f"Failed to generate labels: {str(e)}")

    def _build_system_prompt(self) -> str:
        """Build the system prompt for the labeling agent"""
        return """You are an expert task labeling agent. Your role is to analyze tasks and generate comprehensive, actionable labels that help users decide when and where to complete tasks.

Analyze tasks across these dimensions:

**LOCATION** (where the task should be done):
- home, office, outdoor, gym, store, cafe, library, anywhere, specific-location

**TIME** (when the task is best done):
- early-morning, morning, midday, afternoon, evening, night, late-night
- weekday, weekend, flexible-timing, time-sensitive

**ENERGY** (mental/physical energy required):
- high-energy, medium-energy, low-energy, minimal-energy
- energizing, draining, neutral-energy

**DURATION** (how long it takes):
- quick-5min, short-15min, medium-30min, standard-1hr, long-2hr, extended-4hr+

**MOOD** (mental state needed):
- focused, creative, analytical, social, physical, administrative
- reflective, collaborative, independent, motivated

**CATEGORY** (task type):
- work, personal, health, fitness, shopping, errands, learning
- entertainment, social, family, self-care, finance, household

**PREREQUISITES** (what's needed):
- internet, phone, computer, laptop, tools, transportation
- other-people, specific-app, physical-materials, booking-required

**CONTEXT** (environmental needs):
- quiet-needed, active, collaborative, solo, urgent, flexible
- indoors, outdoors, private, public, focus-required

**TOOLS** (specific tools needed):
- smartphone, laptop, desktop, pen-paper, specific-software
- physical-tools, kitchen, gym-equipment, vehicle

**PEOPLE** (social context):
- solo, with-family, with-friends, with-colleagues, with-partner
- service-provider, group-activity, networking

**WEATHER** (weather dependency):
- indoor-only, outdoor-preferred, weather-dependent, any-weather
- sunny-preferred, temperature-sensitive

**OTHER** (other relevant factors):
- batch-with-similar, preparation-needed, follow-up-required
- deadline-driven, habit-building, one-time, recurring

**IMPORTANT**: The "category" field MUST be one of these exact values (lowercase):
- location
- time
- energy
- duration
- mood
- category
- prerequisites
- context
- tools
- people
- weather
- other

Generate AT LEAST 6-10 labels per task, with confidence scores (0.0-1.0).
Consider: task priority, due date, time of day, user location, and any external factors.

Return JSON in this exact format:
{
  "labels": [
    {
      "label_name": "string (lowercase, hyphenated)",
      "category": "string (MUST be one of the exact values listed above)",
      "confidence": float (0.0-1.0),
      "reasoning": "string (brief explanation)"
    }
  ],
  "summary": "string (brief analysis summary)",
  "external_factors_considered": ["string array of factors you considered"]
}"""

    def _build_user_prompt(self, task_input: TaskLabelingInput) -> str:
        """Build the user prompt with task details"""
        prompt_parts = [
            f"**TASK TO LABEL:**",
            f"Title: {task_input.title}",
        ]

        if task_input.description:
            prompt_parts.append(f"Description: {task_input.description}")

        prompt_parts.extend([
            f"Priority: {task_input.priority}",
        ])

        if task_input.due_date:
            prompt_parts.append(f"Due Date: {task_input.due_date.isoformat()}")

            # Add time context
            now = datetime.utcnow()
            days_until_due = (task_input.due_date - now).days
            if days_until_due < 0:
                prompt_parts.append(f"⚠️ OVERDUE by {abs(days_until_due)} days")
            elif days_until_due == 0:
                prompt_parts.append("⚠️ DUE TODAY")
            elif days_until_due <= 3:
                prompt_parts.append(f"⚠️ Due in {days_until_due} days (urgent)")
            else:
                prompt_parts.append(f"Due in {days_until_due} days")

        # Add user context if available
        if task_input.user_context:
            prompt_parts.append("\n**USER CONTEXT:**")

            if task_input.user_context.timezone:
                prompt_parts.append(f"Timezone: {task_input.user_context.timezone}")

            if task_input.user_context.location:
                prompt_parts.append(f"Location: {task_input.user_context.location}")

            if task_input.user_context.preferences:
                prompt_parts.append(f"Preferences: {json.dumps(task_input.user_context.preferences)}")

        # Add current time context
        now = datetime.utcnow()
        prompt_parts.extend([
            f"\n**CURRENT CONTEXT:**",
            f"Current Time (UTC): {now.strftime('%Y-%m-%d %H:%M')}",
            f"Day of Week: {now.strftime('%A')}",
            f"Time of Day: {self._get_time_of_day(now)}",
        ])

        prompt_parts.append("\n**INSTRUCTIONS:**")
        prompt_parts.append("Generate comprehensive labels (minimum 6) that will help determine the best time and context to complete this task.")
        prompt_parts.append("Consider all external factors that might affect task completion.")
        prompt_parts.append("Return ONLY valid JSON in the specified format.")

        return "\n".join(prompt_parts)

    def _get_time_of_day(self, dt: datetime) -> str:
        """Determine time of day category"""
        hour = dt.hour
        if 5 <= hour < 8:
            return "early-morning"
        elif 8 <= hour < 12:
            return "morning"
        elif 12 <= hour < 14:
            return "midday"
        elif 14 <= hour < 17:
            return "afternoon"
        elif 17 <= hour < 21:
            return "evening"
        elif 21 <= hour < 24:
            return "night"
        else:
            return "late-night"

    async def validate_labels(self, labels: List[GeneratedLabel]) -> bool:
        """Validate that labels meet minimum requirements"""
        if len(labels) < 6:
            return False

        # Check that we have diversity in categories
        categories = set(label.category for label in labels)
        if len(categories) < 3:
            return False

        # Check confidence scores are valid
        for label in labels:
            if not (0.0 <= label.confidence <= 1.0):
                return False

        return True
