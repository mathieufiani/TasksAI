# Testing Guide

This guide walks you through testing the AI-powered task labeling system.

## Prerequisites

Before testing, ensure you have:
1. PostgreSQL running (via Docker or locally)
2. OpenAI API key
3. Pinecone API key
4. Python virtual environment activated
5. Dependencies installed

## Quick Start Testing

### 1. Setup Environment

```bash
cd backend

# Copy environment file
cp .env.example .env

# Edit .env and add your API keys
nano .env  # or use your favorite editor
```

Add these required keys to `.env`:
```bash
OPENAI_API_KEY=sk-your-openai-key-here
PINECONE_API_KEY=your-pinecone-key-here
```

### 2. Start PostgreSQL

```bash
docker-compose up -d postgres
```

Wait 5-10 seconds for PostgreSQL to initialize.

### 3. Install Dependencies

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 4. Start the API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Expected output:
```
INFO:     Started server process
INFO:     Waiting for application startup.
Database tables created successfully!
✓ Pinecone index 'task-recommendations' already exists
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### 5. Verify API is Running

Open browser: http://localhost:8000

Expected response:
```json
{
  "app": "Task Management API",
  "version": "1.0.0",
  "docs": "/docs",
  "redoc": "/redoc"
}
```

## Manual Testing with curl

### Test 1: Create a Task (Triggers Labeling)

```bash
curl -X POST "http://localhost:8000/api/v1/tasks/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Go for a 30-minute run in Central Park",
    "description": "Morning cardio session, weather permitting",
    "priority": "medium",
    "due_date": "2025-10-12T08:00:00"
  }'
```

Expected response (immediate):
```json
{
  "id": 1,
  "title": "Go for a 30-minute run in Central Park",
  "description": "Morning cardio session, weather permitting",
  "status": "todo",
  "priority": "medium",
  "is_active": true,
  "labeling_status": "pending",  // Will be processed in background
  "vector_id": null,
  "created_at": "2025-10-11T...",
  "updated_at": "2025-10-11T...",
  "due_date": "2025-10-12T08:00:00",
  "completed_at": null
}
```

**Important**: Task is created immediately with `labeling_status: "pending"`. Labeling happens in the background.

### Test 2: Check Labeling Status

Wait 3-5 seconds, then check:

```bash
curl "http://localhost:8000/api/v1/labels/task/1/status"
```

Expected response (after labeling completes):
```json
{
  "task_id": 1,
  "labeling_status": "completed",
  "labeling_attempted_at": "2025-10-11T...",
  "labeling_completed_at": "2025-10-11T...",
  "labeling_error": null,
  "labels_count": 8,
  "primary_labels": [
    {
      "id": 1,
      "task_id": 1,
      "label_name": "outdoor",
      "label_category": "location",
      "confidence_score": 0.95,
      "is_primary": true,
      "reasoning": "Task explicitly mentions Central Park, indicating outdoor activity"
    },
    // ... more primary labels
  ]
}
```

### Test 3: Get All Labels

```bash
curl "http://localhost:8000/api/v1/labels/task/1"
```

Expected: Array of 6-10 labels with categories:
- location (outdoor)
- time (morning)
- energy (high-energy)
- duration (short-30min)
- mood (physical)
- category (health)
- people (solo)
- weather (weather-dependent)

### Test 4: Get Only Primary Labels

```bash
curl "http://localhost:8000/api/v1/labels/task/1/primary"
```

Expected: Top 5 most relevant labels

### Test 5: Create More Tasks

```bash
# Task 2: Work task
curl -X POST "http://localhost:8000/api/v1/tasks/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Write project documentation",
    "description": "Complete API documentation for the new endpoints",
    "priority": "high",
    "due_date": "2025-10-13T17:00:00"
  }'

# Task 3: Quick errand
curl -X POST "http://localhost:8000/api/v1/tasks/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Buy groceries at Whole Foods",
    "description": "Milk, eggs, bread, vegetables",
    "priority": "medium"
  }'

# Task 4: Social task
curl -X POST "http://localhost:8000/api/v1/tasks/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Call mom to catch up",
    "description": "Weekly check-in call",
    "priority": "low",
    "due_date": "2025-10-14T19:00:00"
  }'
```

Wait 10-15 seconds for all to be labeled.

### Test 6: List All Tasks

```bash
curl "http://localhost:8000/api/v1/tasks/"
```

### Test 7: Search Tasks by Label

```bash
# Find outdoor tasks
curl "http://localhost:8000/api/v1/labels/search/by-label?label_names=outdoor"

# Find morning tasks with high energy
curl "http://localhost:8000/api/v1/labels/search/by-label?label_names=morning&label_names=high-energy"

# Find tasks requiring internet
curl "http://localhost:8000/api/v1/labels/search/by-label?label_names=internet&primary_only=true"
```

### Test 8: Update a Task (Triggers Re-labeling)

```bash
curl -X PUT "http://localhost:8000/api/v1/tasks/1" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Go for a 5K run in Central Park at sunrise",
    "description": "Early morning long run for marathon training"
  }'
```

This should trigger re-labeling because the content changed significantly.

### Test 9: Manually Trigger Re-labeling

```bash
curl -X POST "http://localhost:8000/api/v1/labels/task/1/re-label"
```

### Test 10: Update a Label (User Edit)

```bash
curl -X PUT "http://localhost:8000/api/v1/labels/1" \
  -H "Content-Type: application/json" \
  -d '{
    "label_name": "very-high-energy",
    "is_primary": true
  }'
```

### Test 11: Get Label Statistics

```bash
curl "http://localhost:8000/api/v1/labels/statistics"
```

Expected:
```json
{
  "total_labels": 32,
  "by_category": {
    "location": 4,
    "time": 4,
    "energy": 4,
    "duration": 4,
    "mood": 4,
    "category": 4,
    "people": 4,
    "weather": 2,
    "prerequisites": 2
  },
  "most_common_labels": [
    {
      "label_name": "indoor",
      "category": "location",
      "count": 2,
      "avg_confidence": 0.87
    },
    // ... more
  ]
}
```

### Test 12: Get Task Statistics

```bash
curl "http://localhost:8000/api/v1/tasks/stats/summary"
```

## Testing with Interactive API Docs

### Swagger UI (Recommended)

1. Open: http://localhost:8000/docs
2. You'll see all endpoints with interactive testing
3. Click "Try it out" on any endpoint
4. Fill in parameters
5. Click "Execute"
6. View response

**Benefits**:
- Visual interface
- Auto-complete for enum values
- Validation feedback
- Response schema display

### ReDoc

Alternative documentation: http://localhost:8000/redoc

## Monitoring the Background Process

### Check Server Logs

When labeling happens, you'll see output like:

```
✓ Task 1 labeled successfully with 8 labels
✓ Task 1 embedding upserted to Pinecone with ID: task_1_a3f8b2c1
```

If errors occur:
```
✗ Error labeling task 1: <error message>
```

### Check Database Directly

```bash
# Connect to PostgreSQL
docker exec -it taskdb_postgres psql -U postgres -d taskdb

# Check labeling status
SELECT id, title, labeling_status, labeling_error
FROM tasks;

# Check label counts
SELECT task_id, COUNT(*) as label_count
FROM task_labels
GROUP BY task_id;

# See all labels
SELECT t.title, tl.label_name, tl.label_category, tl.confidence_score
FROM tasks t
JOIN task_labels tl ON t.id = tl.task_id
ORDER BY t.id, tl.confidence_score DESC;
```

## Testing Pinecone Integration

### Check Pinecone Index

```bash
curl "http://localhost:8000/health"
```

The startup logs should show:
```
✓ Pinecone index 'task-recommendations' already exists
```

### Verify Vectors Were Stored

You can check your Pinecone dashboard:
1. Go to https://app.pinecone.io/
2. Select your index
3. Check "Index fullness" - should show vectors

## Common Issues and Solutions

### Issue 1: Labels Not Generating

**Symptoms**: `labeling_status` stays "pending" or changes to "failed"

**Check**:
```bash
curl "http://localhost:8000/api/v1/labels/task/1/status"
```

**Solutions**:
1. Verify OpenAI API key is valid
2. Check server logs for errors
3. Ensure you have OpenAI API credits
4. Try manual re-labeling:
   ```bash
   curl -X POST "http://localhost:8000/api/v1/labels/task/1/re-label"
   ```

### Issue 2: Pinecone Errors

**Symptoms**: Errors mentioning Pinecone in logs

**Solutions**:
1. Verify Pinecone API key
2. Check index exists in Pinecone dashboard
3. Verify region/cloud settings match

### Issue 3: Database Connection Error

**Symptoms**: "Connection refused" or "database does not exist"

**Solutions**:
```bash
# Restart PostgreSQL
docker-compose restart postgres

# Wait 10 seconds, then restart API
```

### Issue 4: "Model not found" Error

**Symptoms**: GPT-4 errors

**Solutions**:
- If you don't have GPT-4 access, change to GPT-3.5:
  ```bash
  # In .env
  OPENAI_MODEL=gpt-3.5-turbo
  ```

## Performance Testing

### Measure Labeling Time

```bash
# Create task and note time
time curl -X POST "http://localhost:8000/api/v1/tasks/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Test task",
    "description": "Performance testing"
  }'

# Wait, then check when completed
curl "http://localhost:8000/api/v1/labels/task/1/status" | grep labeling_completed_at
```

Typical times:
- API response: < 100ms
- Background labeling: 2-5 seconds
- Total with embedding: 3-6 seconds

### Load Testing

Create multiple tasks quickly:
```bash
for i in {1..10}; do
  curl -X POST "http://localhost:8000/api/v1/tasks/" \
    -H "Content-Type: application/json" \
    -d "{\"title\": \"Test task $i\", \"description\": \"Load test\"}"
done
```

Check how many complete successfully:
```bash
curl "http://localhost:8000/api/v1/tasks/stats/summary"
```

## Next Steps

After manual testing:

1. **Test iOS App Integration**
   - Connect your iOS app to http://localhost:8000
   - Test task creation from the app
   - Display labels in the UI
   - Add label filtering

2. **Add Automated Tests** (future)
   - Unit tests for labeling agent
   - Integration tests for API endpoints
   - End-to-end tests with test database

3. **Deploy to Production**
   - Set up production PostgreSQL
   - Configure production Pinecone index
   - Deploy to cloud (AWS, GCP, etc.)
   - Set up monitoring

## Troubleshooting Commands

```bash
# Check if API is running
curl http://localhost:8000/health

# Check PostgreSQL
docker ps | grep postgres

# View PostgreSQL logs
docker logs taskdb_postgres

# View API logs (if running)
# Just check the terminal where uvicorn is running

# Restart everything
docker-compose restart
```

## Testing Checklist

- [ ] API starts without errors
- [ ] Can create task via POST
- [ ] Task gets `labeling_status: "pending"` immediately
- [ ] After 5 seconds, `labeling_status` becomes "completed"
- [ ] Can retrieve labels via GET
- [ ] Labels have confidence scores
- [ ] At least 6 labels generated
- [ ] Primary labels marked correctly
- [ ] Can search by labels
- [ ] Update triggers re-labeling
- [ ] Label statistics endpoint works
- [ ] Swagger docs accessible at /docs

---

**Ready to test? Start with Step 1-5 above, then run Test 1-3 to verify the core labeling functionality!**
