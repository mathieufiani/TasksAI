# Task Management API with AI-Powered Labeling

A RESTful API built with FastAPI and PostgreSQL for intelligent task management. Features an AI-powered labeling system using OpenAI GPT-4 and Pinecone vector database for context-aware task recommendations.

## Features

### Core Features
- Full CRUD operations for tasks
- Task filtering and search
- Pagination support
- Soft delete functionality
- Task statistics endpoint

### AI-Powered Labeling System ✨
- **Automatic task labeling** using OpenAI GPT-4
- **Minimum 6 labels per task** with confidence scores
- **12 label categories**: location, time, energy, duration, mood, category, prerequisites, context, tools, people, weather, and more
- **Async background processing** - non-blocking labeling
- **Semantic search** with Pinecone vector database
- **Task recommendations** based on user context (future)

### Technical Stack
- PostgreSQL database with SQLAlchemy ORM
- Pydantic schemas for validation
- Docker support
- OpenAI GPT-4 for intelligent analysis
- Pinecone for vector embeddings

## Tech Stack

- **FastAPI**: Modern, fast web framework for building APIs
- **PostgreSQL**: Robust relational database
- **SQLAlchemy**: Python SQL toolkit and ORM
- **Pydantic**: Data validation using Python type annotations
- **OpenAI GPT-4**: AI-powered task analysis and labeling
- **Pinecone**: Vector database for semantic search
- **Docker**: Containerization for easy deployment

## Project Structure

```
backend/
├── app/
│   ├── agents/
│   │   └── labeling_agent.py     # AI labeling agent (GPT-4)
│   ├── api/
│   │   └── endpoints/
│   │       ├── tasks.py           # Task endpoints
│   │       └── labels.py          # Label management endpoints
│   ├── core/
│   │   └── config.py              # Configuration settings
│   ├── db/
│   │   ├── session.py             # Database session
│   │   └── init_db.py             # Database initialization
│   ├── models/
│   │   └── task.py                # SQLAlchemy models (Task, TaskLabel)
│   ├── schemas/
│   │   ├── task.py                # Task Pydantic schemas
│   │   └── label.py               # Label Pydantic schemas
│   ├── services/
│   │   ├── background_tasks.py    # Async labeling service
│   │   └── pinecone_service.py    # Vector DB operations
│   └── main.py                    # FastAPI application
├── requirements.txt               # Python dependencies
├── docker-compose.yml             # Docker services
├── Dockerfile                     # API container
├── .env.example                   # Environment variables template
├── README.md                      # This file
└── LABELING_SYSTEM.md             # Detailed labeling documentation
```

## Setup Instructions

### Prerequisites

- Python 3.11+
- Docker and Docker Compose (optional, for containerized setup)
- PostgreSQL (if not using Docker)

### Option 1: Using Docker (Recommended)

1. **Clone and navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Copy environment file and add API keys**
   ```bash
   cp .env.example .env
   # Edit .env and add:
   # - OPENAI_API_KEY=your_key_here
   # - PINECONE_API_KEY=your_key_here
   ```

3. **Start PostgreSQL with Docker**
   ```bash
   docker-compose up -d postgres
   ```

4. **Set up Python virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

5. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

6. **Run the API**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Option 2: Without Docker

1. **Install PostgreSQL**
   - Install PostgreSQL on your system
   - Create a database named `taskdb`

2. **Set up Python environment**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure environment**
   ```bash
   cp .env.example .env
   # Edit .env with your PostgreSQL credentials
   ```

4. **Run the API**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Accessing the API

- **API Base URL**: http://localhost:8000
- **Interactive Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/health

### Accessing pgAdmin (if using Docker)

- **URL**: http://localhost:5050
- **Email**: admin@admin.com
- **Password**: admin

## API Endpoints

### Tasks

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/tasks/` | Create a new task (triggers async labeling) |
| GET | `/api/v1/tasks/` | List tasks (with pagination and filters) |
| GET | `/api/v1/tasks/{task_id}` | Get a specific task |
| PUT | `/api/v1/tasks/{task_id}` | Update a task (triggers re-labeling if content changed) |
| DELETE | `/api/v1/tasks/{task_id}` | Delete a task (soft delete by default) |
| GET | `/api/v1/tasks/stats/summary` | Get task statistics |

### Labels

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/labels/task/{task_id}` | Get all labels for a task |
| GET | `/api/v1/labels/task/{task_id}/primary` | Get primary labels for a task |
| GET | `/api/v1/labels/task/{task_id}/status` | Check labeling status |
| PUT | `/api/v1/labels/{label_id}` | Update a label (user edit) |
| DELETE | `/api/v1/labels/{label_id}` | Delete a label |
| POST | `/api/v1/labels/task/{task_id}/re-label` | Manually trigger re-labeling |
| GET | `/api/v1/labels/search/by-label` | Search tasks by labels |
| GET | `/api/v1/labels/statistics` | Get label statistics |

### Query Parameters for List Tasks

- `page`: Page number (default: 1)
- `page_size`: Items per page (default: 10, max: 100)
- `status`: Filter by status (todo, in_progress, completed, cancelled)
- `priority`: Filter by priority (low, medium, high, urgent)
- `is_active`: Filter by active status (true/false)
- `search`: Search in title and description

## Example API Usage

### Create a Task

```bash
curl -X POST "http://localhost:8000/api/v1/tasks/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Implement AI Agent",
    "description": "Integrate Pydantic-based AI agent for task automation",
    "status": "todo",
    "priority": "high",
    "due_date": "2025-10-20T10:00:00"
  }'
```

### List Tasks

```bash
curl "http://localhost:8000/api/v1/tasks/?page=1&page_size=10&status=todo"
```

### Update a Task

```bash
curl -X PUT "http://localhost:8000/api/v1/tasks/1" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "in_progress",
    "priority": "urgent"
  }'
```

### Get Task Statistics

```bash
curl "http://localhost:8000/api/v1/tasks/stats/summary"
```

## AI Labeling System

### Quick Overview

When you create or update a task, the system automatically:

1. **Analyzes** the task using OpenAI GPT-4
2. **Generates** 6+ labels across 12 categories
3. **Stores** labels with confidence scores
4. **Embeds** the task into Pinecone vector database
5. **Enables** semantic search and future recommendations

### Label Categories

- **Location**: home, office, outdoor, gym, cafe, anywhere
- **Time**: morning, afternoon, evening, weekend, flexible
- **Energy**: high-energy, medium-energy, low-energy
- **Duration**: quick-5min, short-15min, medium-1hr, long-2hr+
- **Mood**: focused, creative, social, physical, administrative
- **Category**: work, personal, health, shopping, learning
- **Prerequisites**: internet, phone, computer, tools, other-people
- **Context**: quiet-needed, active, solo, urgent, flexible
- **Tools**: smartphone, laptop, pen-paper, specific-software
- **People**: solo, with-family, with-friends, with-colleagues
- **Weather**: indoor-only, outdoor-preferred, weather-dependent
- **Other**: batch-with-similar, deadline-driven, recurring

### Example

**Task**: "Go for a 30-minute run in the park"

**Generated Labels**:
- `outdoor` (location, confidence: 0.95)
- `physical` (mood, confidence: 0.92)
- `high-energy` (energy, confidence: 0.88)
- `short-30min` (duration, confidence: 0.90)
- `morning` (time, confidence: 0.75)
- `sunny-preferred` (weather, confidence: 0.70)
- `solo` (people, confidence: 0.80)
- `health` (category, confidence: 0.85)

### Future: Task Recommendations

The labeling system enables intelligent task recommendations based on:
- Current location
- Time of day
- Energy level
- Available time
- Weather conditions
- Social context

**See [LABELING_SYSTEM.md](LABELING_SYSTEM.md) for complete documentation.**

## Task Model Fields

- `id`: Unique identifier
- `title`: Task title (required)
- `description`: Detailed description (optional)
- `status`: todo | in_progress | completed | cancelled
- `priority`: low | medium | high | urgent
- `is_active`: Boolean flag for soft delete
- `labeling_status`: pending | in_progress | completed | failed
- `vector_id`: Pinecone vector ID for semantic search
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update
- `due_date`: Optional deadline
- `completed_at`: Timestamp when marked as completed

## Development

### Running Tests

```bash
# Install test dependencies
pip install pytest pytest-cov

# Run tests
pytest tests/
```

### Database Migrations with Alembic

```bash
# Initialize Alembic (if not already done)
alembic init alembic

# Create a migration
alembic revision --autogenerate -m "Add new field"

# Apply migrations
alembic upgrade head
```

## Environment Variables

See `.env.example` for all available configuration options:

### Required
- `OPENAI_API_KEY`: Your OpenAI API key (required for labeling)
- `PINECONE_API_KEY`: Your Pinecone API key (required for vector search)
- `DATABASE_URL`: PostgreSQL connection string

### Optional
- `OPENAI_MODEL`: GPT model (default: gpt-4)
- `OPENAI_EMBEDDING_MODEL`: Embedding model (default: text-embedding-3-small)
- `PINECONE_INDEX_NAME`: Index name (default: task-recommendations)
- `PINECONE_NAMESPACE`: Namespace (default: default)
- `PINECONE_CLOUD`: Cloud provider (default: aws)
- `PINECONE_REGION`: Region (default: us-east-1)
- `DEBUG`: Enable debug mode
- `BACKEND_CORS_ORIGINS`: Allowed CORS origins
- `API_V1_PREFIX`: API version prefix

## Documentation

- **Main README**: This file
- **[Labeling System Documentation](LABELING_SYSTEM.md)**: Complete guide to the AI labeling system
- **API Docs**: http://localhost:8000/docs (when running)

## License

MIT License
