# Quick Start Guide

Get the AI-powered task labeling system running in 5 minutes!

## Step 1: Setup API Keys

```bash
cd backend
cp .env.example .env
```

Edit `.env` and add your API keys:
```bash
OPENAI_API_KEY=sk-your-openai-key-here
PINECONE_API_KEY=your-pinecone-key-here
```

**Get API Keys:**
- OpenAI: https://platform.openai.com/api-keys
- Pinecone: https://app.pinecone.io/ (free tier available)

## Step 2: Start PostgreSQL

```bash
docker-compose up -d postgres
```

Wait 10 seconds for PostgreSQL to initialize.

## Step 3: Install Dependencies

```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Step 4: Start the API

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
✓ Pinecone index 'task-recommendations' already exists
Database tables created successfully!
Uvicorn running on http://0.0.0.0:8000
```

## Step 5: Test It!

### Option A: Run Automated Test Script

```bash
# In a new terminal
cd backend
source venv/bin/activate
python test_system.py
```

Expected output:
```
[TEST 1/7] API Health Check
✓ API is running

[TEST 2/7] Task Creation
✓ Task created with ID: 1

[TEST 3/7] Labeling Completion
✓ Labeling completed! Generated 8 labels

...

🎉 All tests passed! System is working correctly.
```

### Option B: Manual Test with curl

```bash
# Create a task
curl -X POST "http://localhost:8000/api/v1/tasks/" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Go for a 30-minute run in the park",
    "description": "Morning cardio session",
    "priority": "medium"
  }'

# Wait 5 seconds, then check labels
curl "http://localhost:8000/api/v1/labels/task/1"
```

### Option C: Use Swagger UI

1. Open: http://localhost:8000/docs
2. Click on `POST /api/v1/tasks/`
3. Click "Try it out"
4. Enter task data
5. Click "Execute"
6. Wait 5 seconds
7. Try `GET /api/v1/labels/task/{task_id}` to see labels

## What's Happening?

When you create a task:

1. **Task saved** to PostgreSQL immediately (response < 100ms)
2. **Background process** starts labeling (doesn't block API)
3. **GPT-4 analyzes** task and generates 6+ labels (2-3 seconds)
4. **Labels stored** with confidence scores
5. **Embedding created** using OpenAI (500ms)
6. **Vector stored** in Pinecone for semantic search (200ms)

Total time: ~3-5 seconds (all in background)

## Example Output

### Created Task
```json
{
  "id": 1,
  "title": "Go for a 30-minute run in the park",
  "labeling_status": "pending"  // Changes to "completed" after 3-5s
}
```

### Generated Labels
```json
[
  {
    "label_name": "outdoor",
    "label_category": "location",
    "confidence_score": 0.95,
    "reasoning": "Task mentions 'park' indicating outdoor activity"
  },
  {
    "label_name": "physical",
    "label_category": "mood",
    "confidence_score": 0.92
  },
  {
    "label_name": "high-energy",
    "label_category": "energy",
    "confidence_score": 0.88
  },
  {
    "label_name": "short-30min",
    "label_category": "duration",
    "confidence_score": 0.90
  },
  {
    "label_name": "morning",
    "label_category": "time",
    "confidence_score": 0.75
  },
  {
    "label_name": "health",
    "label_category": "category",
    "confidence_score": 0.85
  }
]
```

## Troubleshooting

### "Cannot connect to API"
- Make sure API is running: `uvicorn app.main:app --reload`
- Check: http://localhost:8000/health

### "Labels not generating"
- Check OpenAI API key is valid and has credits
- Check Pinecone API key is valid
- Look at API terminal for error messages
- Try: `curl http://localhost:8000/api/v1/labels/task/1/status`

### "Pinecone errors"
- Verify API key at: https://app.pinecone.io/
- Check region in `.env` matches your Pinecone setup

### "Database errors"
- Restart PostgreSQL: `docker-compose restart postgres`
- Wait 10 seconds and restart API

## Next Steps

1. **Create more tasks** - Try different types (work, personal, errands)
2. **Explore API** - Open http://localhost:8000/docs
3. **Search by labels** - Use `/api/v1/labels/search/by-label`
4. **Check statistics** - Use `/api/v1/labels/statistics`
5. **Connect iOS app** - Point your app to http://localhost:8000

## Full Documentation

- **[TESTING.md](TESTING.md)**: Complete testing guide with all curl commands
- **[LABELING_SYSTEM.md](LABELING_SYSTEM.md)**: Full system documentation
- **[README.md](README.md)**: Main README with features and setup

## API Endpoints

### Core Endpoints
- `POST /api/v1/tasks/` - Create task (triggers labeling)
- `GET /api/v1/tasks/` - List tasks
- `GET /api/v1/labels/task/{id}` - Get task labels
- `GET /api/v1/labels/task/{id}/status` - Check labeling status

### Useful Endpoints
- Interactive docs: http://localhost:8000/docs
- Health check: http://localhost:8000/health
- Label search: `/api/v1/labels/search/by-label`
- Statistics: `/api/v1/labels/statistics`

---

**Questions?** Check [TESTING.md](TESTING.md) for detailed examples!
