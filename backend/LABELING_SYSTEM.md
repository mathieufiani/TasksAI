# AI-Powered Task Labeling System

## Overview

The task management API includes an intelligent labeling system powered by OpenAI GPT-4 and Pinecone vector database. This system automatically analyzes tasks and generates comprehensive labels to enable context-aware task recommendations.

## Architecture

### Components

1. **LabelingAgent** (`app/agents/labeling_agent.py`)
   - Uses OpenAI GPT-4 for intelligent task analysis
   - Generates minimum 6 labels per task with confidence scores
   - Considers task content, priority, due date, and user context
   - Returns structured labels with reasoning

2. **PineconeService** (`app/services/pinecone_service.py`)
   - Manages vector embeddings using OpenAI text-embedding-3-small
   - Stores task vectors for semantic search
   - Enables similarity-based task recommendations

3. **BackgroundLabelingService** (`app/services/background_tasks.py`)
   - Handles async labeling operations
   - Processes labeling without blocking API responses
   - Manages re-labeling on task updates

4. **Database Models** (`app/models/task.py`)
   - `Task`: Extended with labeling metadata
   - `TaskLabel`: Stores labels with confidence scores and categories

## Label Categories

The system generates labels across 12 categories:

### 1. **LOCATION**
Where the task should be done
- Examples: home, office, outdoor, gym, store, cafe, anywhere

### 2. **TIME**
When the task is best done
- Examples: early-morning, morning, afternoon, evening, weekend, weekday

### 3. **ENERGY**
Mental/physical energy required
- Examples: high-energy, medium-energy, low-energy, energizing, draining

### 4. **DURATION**
How long the task takes
- Examples: quick-5min, short-15min, medium-30min, standard-1hr, long-2hr+

### 5. **MOOD**
Mental state needed
- Examples: focused, creative, analytical, social, physical, collaborative

### 6. **CATEGORY**
Task type classification
- Examples: work, personal, health, fitness, shopping, learning, entertainment

### 7. **PREREQUISITES**
What's needed to complete the task
- Examples: internet, phone, computer, tools, transportation, other-people

### 8. **CONTEXT**
Environmental needs
- Examples: quiet-needed, active, solo, urgent, flexible, focus-required

### 9. **TOOLS**
Specific tools required
- Examples: smartphone, laptop, pen-paper, specific-software, physical-tools

### 10. **PEOPLE**
Social context
- Examples: solo, with-family, with-friends, with-colleagues, service-provider

### 11. **WEATHER**
Weather dependency
- Examples: indoor-only, outdoor-preferred, weather-dependent, any-weather

### 12. **OTHER**
Additional relevant factors
- Examples: batch-with-similar, preparation-needed, deadline-driven

## Workflow

### Task Creation Flow

```
1. User creates task via POST /api/v1/tasks/
   ↓
2. Task saved to DB with labeling_status=PENDING
   ↓
3. Background labeling task triggered
   ↓
4. API returns task immediately (non-blocking)
   ↓
5. Background process:
   a. Labeling status → IN_PROGRESS
   b. LabelingAgent analyzes task with GPT-4
   c. Generates 6+ labels with confidence scores
   d. Validates labels (min 6, diverse categories)
   e. Saves labels to task_labels table
   f. Generates embedding via OpenAI
   g. Upserts vector to Pinecone
   h. Labeling status → COMPLETED
```

### Task Update Flow

```
1. User updates task via PUT /api/v1/tasks/{id}
   ↓
2. Check if content changed (title/description/priority/due_date)
   ↓
3. If changed:
   a. Update task in DB
   b. Trigger re-labeling in background
   c. Process same as creation flow
   ↓
4. If not changed:
   - Just update task fields
```

## API Endpoints

### Task Endpoints (with Labeling)

#### Create Task
```http
POST /api/v1/tasks/
Content-Type: application/json

{
  "title": "Go for a run in the park",
  "description": "30-minute cardio session",
  "priority": "medium",
  "due_date": "2025-10-12T08:00:00"
}

Response: 201 Created
{
  "id": 1,
  "title": "Go for a run in the park",
  "labeling_status": "pending",  # Will be processed in background
  ...
}
```

#### Update Task (triggers re-labeling)
```http
PUT /api/v1/tasks/1
Content-Type: application/json

{
  "title": "Go for a 5K run in the park",  # Changed
  "priority": "high"
}
```

### Label Endpoints

#### Get Task Labels
```http
GET /api/v1/labels/task/1
```

Response:
```json
[
  {
    "id": 1,
    "task_id": 1,
    "label_name": "outdoor",
    "label_category": "location",
    "confidence_score": 0.95,
    "is_primary": true,
    "reasoning": "Task explicitly mentions 'park' indicating outdoor activity",
    "created_at": "2025-10-11T10:00:00"
  },
  {
    "id": 2,
    "task_id": 1,
    "label_name": "physical",
    "label_category": "mood",
    "confidence_score": 0.92,
    "is_primary": true,
    "reasoning": "Running is a physical activity requiring movement"
  },
  ...
]
```

#### Get Primary Labels Only
```http
GET /api/v1/labels/task/1/primary
```

#### Check Labeling Status
```http
GET /api/v1/labels/task/1/status
```

Response:
```json
{
  "task_id": 1,
  "labeling_status": "completed",
  "labeling_attempted_at": "2025-10-11T10:00:01",
  "labeling_completed_at": "2025-10-11T10:00:05",
  "labeling_error": null,
  "labels_count": 8,
  "primary_labels": [...]
}
```

#### Update Label (User Edit)
```http
PUT /api/v1/labels/5
Content-Type: application/json

{
  "label_name": "morning-preferred",
  "is_primary": true
}
```

#### Delete Label
```http
DELETE /api/v1/labels/5
```

#### Trigger Re-labeling
```http
POST /api/v1/labels/task/1/re-label
```

#### Search Tasks by Label
```http
GET /api/v1/labels/search/by-label?label_names=outdoor&label_names=morning&primary_only=true
```

#### Label Statistics
```http
GET /api/v1/labels/statistics
```

## Label Metadata

Each label includes:

- `label_name`: The label text (e.g., "high-energy")
- `label_category`: One of 12 categories
- `confidence_score`: 0.0 to 1.0 (AI confidence)
- `is_primary`: Top 5 labels for display
- `is_user_edited`: User manually modified
- `original_label`: Original AI label if edited
- `reasoning`: Why this label was assigned
- `metadata`: Additional structured data

## Vector Search with Pinecone

### Embedding Generation

Each task is embedded as:
```
"Title: Go for a run | Description: 30-minute cardio | Priority: medium | Labels: outdoor (location), physical (mood), high-energy (energy), short-30min (duration)..."
```

### Semantic Search

Find similar tasks based on context:
```python
from app.services.pinecone_service import PineconeService

pinecone = PineconeService()
results = await pinecone.search_similar_tasks(
    query_text="I'm at home, feeling energetic, have 30 minutes free",
    top_k=5
)
```

## Future: Task Recommendation System

The labeling system is designed for the ultimate goal: **Context-Aware Task Recommendations**

### Recommendation Flow (Future)

```
1. User provides context:
   - Location (GPS, manual input)
   - Time of day
   - Mood/energy level (voice/text input)
   - Available time
   - Weather conditions
   - Social context (alone/with others)

2. System processes context:
   - Generate embedding of user's situation
   - Search Pinecone for matching tasks
   - Filter by labels matching context
   - Rank by relevance and confidence

3. Return recommended tasks:
   - Tasks that match current context
   - Sorted by best fit
   - With explanation of why recommended
```

### Example Use Case

**User Input** (voice):
> "I'm at home, feeling pretty energetic, have about an hour before lunch, and it's sunny outside"

**System Analysis**:
- Location: home, outdoor-possible
- Energy: high-energy
- Duration: ~1 hour
- Weather: sunny, good-weather
- Time: morning/midday

**Recommended Tasks**:
1. "Go for a run in the park" (95% match)
   - Labels: outdoor, physical, high-energy, short-30min, morning, sunny-preferred
2. "Organize garage" (78% match)
   - Labels: home, physical, medium-1hr, flexible-timing
3. "Read that book chapter" (45% match)
   - Labels: home, focused, low-energy, medium-30min

## Configuration

### Environment Variables

```bash
# OpenAI (required)
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Pinecone (required)
PINECONE_API_KEY=...
PINECONE_INDEX_NAME=task-recommendations
PINECONE_NAMESPACE=default
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1
```

### Customization

#### Adjust Minimum Labels

Edit `app/schemas/label.py`:
```python
class TaskLabelingOutput(BaseModel):
    labels: List[GeneratedLabel] = Field(..., min_length=10)  # Increase to 10
```

#### Modify Label Categories

Edit `app/models/task.py`:
```python
class LabelCategory(str, enum.Enum):
    # Add new categories
    SKILL_LEVEL = "skill_level"
    BUDGET = "budget"
```

#### Customize Prompts

Edit `app/agents/labeling_agent.py` to modify system prompts and labeling logic.

## Monitoring

### Check Labeling Status

```sql
SELECT
  labeling_status,
  COUNT(*) as count
FROM tasks
GROUP BY labeling_status;
```

### Failed Labelings

```sql
SELECT id, title, labeling_error
FROM tasks
WHERE labeling_status = 'failed';
```

### Label Distribution

```http
GET /api/v1/labels/statistics
```

## Best Practices

1. **Always provide good task descriptions** - Better descriptions = better labels
2. **Review primary labels** - The top 5 labels are most important for matching
3. **Edit labels when needed** - User edits improve the system over time
4. **Monitor failed labelings** - Check errors and re-trigger if needed
5. **Use specific titles** - "Buy groceries at Whole Foods" vs "Shopping"

## Performance

- **Labeling time**: ~2-5 seconds per task (async, non-blocking)
- **Embedding generation**: ~500ms
- **Pinecone upsert**: ~200ms
- **Search latency**: ~100-300ms

## Troubleshooting

### Labels not generating

1. Check OpenAI API key is valid
2. Check task labeling_status and labeling_error
3. Review logs for errors
4. Manually trigger re-labeling

### Pinecone errors

1. Verify Pinecone API key and index name
2. Check index exists: visit Pinecone dashboard
3. Verify region and cloud settings match

### Low-quality labels

1. Improve task title and description
2. Adjust GPT-4 temperature in agent (default 0.7)
3. Modify system prompt for better instructions
