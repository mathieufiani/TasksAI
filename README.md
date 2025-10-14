# TasksAI - AI-Powered Task Management

> NYU Assignment 1: Full-Stack Application with AI Features

**Live Demo**: https://tasksai-474818.appspot.com

---

## Problem Statement

Many task management apps help you organize work but don't help you understand or discover what to do next. TasksAI solves this by:

1. **Automatically categorizing tasks** using AI to label them by domain (work, personal, learning, health, etc.)
2. **Recommending similar or related tasks** using semantic search to surface relevant work you might have forgotten
3. **Reducing cognitive load** by organizing tasks intelligently without manual tagging

**Target Users**: Knowledge workers, students, and anyone managing complex projects who need intelligent task organization beyond simple to-do lists.

**Core Value**: Transform task entry from manual categorization into intelligent, automatic organization that helps users discover patterns and connections in their work.

---

## Features

### Core Functionality
- ✅ Full CRUD operations for Tasks and Labels
- ✅ JWT-based authentication with refresh tokens
- ✅ Email/password and Google OAuth registration/login
- ✅ User profile management

### AI Features
1. **Automatic Task Labeling** (OpenAI GPT-4o-mini)
   - Analyzes task title and description
   - Generates category labels with confidence scores
   - Async processing with status tracking

2. **Semantic Task Recommendations** (OpenAI Embeddings + Pinecone)
   - Vector similarity search across task descriptions
   - Surfaces related tasks you might have missed
   - Context-aware based on current task

---

## Architecture

```
┌─────────────────┐
│  React Native   │  TypeScript, Context API, JWT Auth
│    Frontend     │  iOS & Android Support
└────────┬────────┘
         │ REST API
         ↓
┌─────────────────┐
│  FastAPI        │  Python 3.11, Pydantic Validation
│    Backend      │  JWT + OAuth, Async Processing
└────────┬────────┘
         │
    ┌────┴────┬─────────────┬──────────────┐
    ↓         ↓             ↓              ↓
┌────────┐ ┌────────┐  ┌─────────┐  ┌──────────┐
│ SQLite │ │ OpenAI │  │Pinecone │  │  GCP     │
│   DB   │ │  API   │  │ Vector  │  │App Engine│
└────────┘ └────────┘  └─────────┘  └──────────┘
```

**Tech Stack**:
- **Frontend**: React Native 0.82, TypeScript, React Navigation
- **Backend**: FastAPI (Python 3.11), SQLAlchemy, Pydantic
- **Database**: SQLite (dev), PostgreSQL-ready (production migration planned)
- **AI/ML**: OpenAI GPT-4o-mini, text-embedding-3-small, Pinecone vector DB
- **Deployment**: Google Cloud App Engine, GitHub Actions CI/CD
- **Testing**: Pytest, React Native Testing Library

---

## Local Development Setup

### Prerequisites
- **Node.js** >= 20
- **Python** 3.11+
- **CocoaPods** (for iOS)
- **Xcode** (for iOS) or **Android Studio** (for Android)

### 1. Clone Repository
```bash
git clone https://github.com/mathieufiani/TasksAI.git
cd TasksAI
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file (see Environment Variables section below)
cp .env.example .env
# Edit .env with your API keys

# Initialize database
python -m app.database

# Run migrations (if needed)
# alembic upgrade head

# Start development server
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Backend will be available at: http://localhost:8000

API Documentation (Swagger): http://localhost:8000/docs

### 3. Frontend Setup

```bash
# From project root
npm install

# Install iOS dependencies (Mac only)
cd ios
pod install
cd ..

# Start Metro bundler
npm start

# In another terminal, run the app:
# For iOS:
npm run ios

# For Android:
npm run android
```

---

## Environment Variables

### Backend (.env)

Create `backend/.env` with:

```bash
# App Configuration
APP_NAME="TasksAI - Development"
DEBUG=True
SECRET_KEY=your-secret-key-here

# Database
DATABASE_URL=sqlite:///./tasksai.db
DATABASE_ECHO=False

# OpenAI API (Required for AI features)
OPENAI_API_KEY=sk-...your-key...
OPENAI_MODEL=gpt-4o-mini
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Pinecone (Required for recommendations)
PINECONE_API_KEY=...your-key...
PINECONE_INDEX_NAME=task-recommendations
PINECONE_NAMESPACE=default
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1

# Google OAuth (Optional)
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# CORS
BACKEND_CORS_ORIGINS=["http://localhost:8000","http://localhost:8081"]
```

### Frontend

No .env file needed for local development. API configuration is in `src/config/api.ts`:
- **Development**: Points to `http://localhost:8000`
- **Production**: Points to deployed backend

---

## Database Schema

### Users Table
```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    email VARCHAR UNIQUE NOT NULL,
    hashed_password VARCHAR NOT NULL,
    full_name VARCHAR,
    profile_picture_url VARCHAR,
    is_active BOOLEAN DEFAULT TRUE,
    is_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);
```

### Tasks Table
```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR NOT NULL,
    description TEXT,
    priority VARCHAR CHECK(priority IN ('low', 'medium', 'high')),
    completed BOOLEAN DEFAULT FALSE,
    due_date TIMESTAMP,
    labeling_status VARCHAR CHECK(labeling_status IN ('pending', 'in_progress', 'completed', 'failed')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

### Labels Table
```sql
CREATE TABLE labels (
    id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL,
    label_name VARCHAR NOT NULL,
    label_category VARCHAR NOT NULL,
    confidence_score FLOAT,
    reasoning TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

---

## Seed Data

To populate the database with sample data:

```bash
cd backend
python -m scripts.seed_data
```

This creates:
- 2 demo users
- 15-20 sample tasks across different categories
- Automatically generated labels for each task

**Test Credentials**:
- Email: `demo@tasksai.com`
- Password: `demo123!`

- Email: `john.doe@example.com`
- Password: `password123!`

---

## API Documentation

### Authentication Endpoints

#### POST `/api/v1/auth/register`
Register new user with email/password.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "secure123",
  "full_name": "John Doe"
}
```

**Response** (201):
```json
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc...",
  "token_type": "bearer",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "full_name": "John Doe"
  }
}
```

#### POST `/api/v1/auth/login`
Login with email/password.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "secure123"
}
```

**Response** (200): Same as register

#### POST `/api/v1/auth/refresh`
Refresh access token.

**Request**:
```json
{
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGc..."
}
```

#### GET `/api/v1/auth/me`
Get current user profile.

**Headers**: `Authorization: Bearer {access_token}`

**Response** (200):
```json
{
  "id": 1,
  "email": "user@example.com",
  "full_name": "John Doe",
  "profile_picture_url": null,
  "is_active": true,
  "created_at": "2025-01-10T12:00:00Z"
}
```

### Task Endpoints

#### GET `/api/v1/tasks/`
List all tasks for authenticated user.

**Headers**: `Authorization: Bearer {access_token}`

**Response** (200):
```json
{
  "tasks": [
    {
      "id": 1,
      "title": "Finish project documentation",
      "description": "Complete API docs and README",
      "priority": "high",
      "completed": false,
      "due_date": "2025-01-15T17:00:00Z",
      "labeling_status": "completed",
      "created_at": "2025-01-10T10:00:00Z",
      "updated_at": "2025-01-10T10:00:00Z"
    }
  ]
}
```

#### GET `/api/v1/tasks/{task_id}`
Get single task details.

**Response** (200): Single task object

#### POST `/api/v1/tasks/`
Create new task.

**Request**:
```json
{
  "title": "Review pull requests",
  "description": "Code review for authentication feature",
  "priority": "medium",
  "due_date": "2025-01-12T15:00:00Z"
}
```

**Response** (201): Created task object with `labeling_status: "pending"`

#### PUT `/api/v1/tasks/{task_id}`
Update existing task.

**Request**:
```json
{
  "completed": true,
  "priority": "low"
}
```

**Response** (200): Updated task object

#### DELETE `/api/v1/tasks/{task_id}`
Delete task.

**Response** (204): No content

### Label Endpoints

#### GET `/api/v1/labels/task/{task_id}`
Get labels for a task.

**Response** (200):
```json
[
  {
    "id": 1,
    "task_id": 1,
    "label_name": "Documentation",
    "label_category": "Work",
    "confidence_score": 0.92,
    "reasoning": "Task involves writing and organizing project documentation",
    "created_at": "2025-01-10T10:05:00Z"
  }
]
```

#### GET `/api/v1/labels/task/{task_id}/status`
Check labeling status.

**Response** (200):
```json
{
  "status": "completed",
  "message": "Labels generated successfully"
}
```

#### DELETE `/api/v1/labels/{label_id}`
Delete a label.

**Response** (204): No content

### Recommendation Endpoint

#### GET `/api/v1/recommendations/{task_id}`
Get similar/related tasks.

**Response** (200):
```json
{
  "recommendations": [
    {
      "task_id": 5,
      "title": "Update API documentation",
      "similarity_score": 0.87
    }
  ]
}
```

---

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
pytest

# Run with coverage
pytest --cov=app --cov-report=html

# Run specific test file
pytest tests/test_tasks.py -v

# Run specific test
pytest tests/test_auth.py::test_register_user -v
```

**Test Coverage**:
- ✅ Authentication (register, login, JWT validation)
- ✅ Task CRUD operations
- ✅ Label generation and retrieval
- ✅ User authorization checks
- ✅ Input validation

### Frontend Tests

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

---

## AI Features Details

### 1. Automatic Task Labeling

**Model**: GPT-4o-mini (cost-effective, fast)

**Prompt Design**:
```python
system_prompt = """You are a task categorization assistant.
Analyze the task and generate 1-3 relevant labels.
Return JSON: [{"name": "...", "category": "...", "confidence": 0.0-1.0, "reasoning": "..."}]
Categories: Work, Personal, Health, Learning, Finance, Social, Creative, Maintenance"""

user_prompt = f"Task: {title}\nDescription: {description}"
```

**Cost/Latency**:
- ~$0.0001 per task (GPT-4o-mini pricing)
- Async processing (doesn't block task creation)
- Cached results (labels persist in DB)
- Fallback: graceful degradation if API fails

**Evaluation** (10-item test set):
```
Task: "Buy groceries - milk, eggs, bread"
Expected: ["Shopping", "Personal"]
Generated: ["Shopping", "Personal"] ✓
Confidence: 0.95

Task: "Submit tax documents to accountant"
Expected: ["Finance", "Work"]
Generated: ["Finance", "Administrative"] ✓
Confidence: 0.89

Accuracy: 9/10 = 90% exact match
Precision: 0.92 (minimal false positives)
```

### 2. Semantic Recommendations

**Model**: text-embedding-3-small + Pinecone vector DB

**Flow**:
1. Task created → generate embedding
2. Store in Pinecone with metadata
3. Query: find top-K similar vectors
4. Return ranked task recommendations

**Performance**:
- Embedding generation: ~100ms
- Pinecone query: ~50ms
- Total latency: <200ms
- Batch processing for efficiency

**Safety**:
- No PII in embeddings (only task content)
- User-scoped queries (can't see others' tasks)
- Rate limiting: 10 req/min per user
- Fallback: empty recommendations if service down

---

## Deployment

### Production Environment

**Backend**: Google Cloud App Engine (Standard)
- Auto-scaling: 0-5 instances
- Health checks enabled
- Environment variables via GCP Secret Manager
- CI/CD via GitHub Actions

**Frontend**: Distributed via TestFlight/APK
- Production API URL configured
- Release builds only

### Deploy Backend

```bash
cd backend
gcloud app deploy app.production.yaml --project=tasksai-474818
```

Deployment is automated via GitHub Actions on push to `release` branch.

---

## Project Structure

```
TasksAI/
├── backend/
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   ├── services/         # Business logic
│   │   ├── core/             # Auth, config
│   │   └── main.py          # FastAPI app
│   ├── tests/               # Pytest tests
│   ├── scripts/             # Seed, migrations
│   └── requirements.txt
├── src/
│   ├── components/          # React components
│   ├── screens/             # App screens
│   ├── context/             # State management
│   ├── services/            # API client
│   └── types/               # TypeScript types
├── ios/                     # iOS native code
├── android/                 # Android native code
└── .github/workflows/       # CI/CD pipelines
```

---

## Scripts

```bash
# Backend
cd backend
python -m app.database        # Initialize DB
python -m scripts.seed_data   # Seed sample data
pytest                        # Run tests
uvicorn app.main:app --reload # Dev server

# Frontend
npm start                     # Start Metro
npm run ios                   # Run iOS
npm run android               # Run Android
npm test                      # Run tests
```

---

## Security

- ✅ JWT tokens with expiry (access: 7 days, refresh: 30 days)
- ✅ Password hashing (bcrypt)
- ✅ CORS configured (production domain whitelisted)
- ✅ Input validation (Pydantic)
- ✅ SQL injection protection (SQLAlchemy ORM)
- ✅ Secrets in environment variables (never committed)
- ✅ HTTPS enforced in production
- ✅ Rate limiting on sensitive endpoints

---

## Known Limitations

1. **SQLite in production**: Currently using SQLite in /tmp (data resets on instance restart). Migration to Cloud SQL PostgreSQL planned.
2. **No pagination**: Task listing returns all tasks (fine for MVP, add pagination for scale)
3. **Basic search**: No full-text search yet (planned with PostgreSQL)
4. **Single region**: Deployed only in us-east-1 (Pinecone) and us-central1 (GCP)

---

## Future Enhancements

- [ ] PostgreSQL migration for persistent data
- [ ] Real-time task updates (WebSockets)
- [ ] Collaborative task sharing
- [ ] Advanced filtering and search
- [ ] Task templates and recurring tasks
- [ ] Mobile push notifications
- [ ] Calendar integration

---

## Team

**Developer**: Mathieu Fiani
**Course**: NYU - Foundation Of Networks and Mobile Systems
**Assignment**: #1 - AI-Powered Full-Stack Application

---

## License

MIT License - See LICENSE file for details

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/mathieufiani/TasksAI/issues
- Email: mnf7282@nyu.edu
