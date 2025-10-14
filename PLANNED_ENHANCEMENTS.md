# TasksAI - Planned Enhancements & GitHub Issues

This document contains detailed descriptions for all planned enhancements. Copy each section to create GitHub issues.

---

## 1. Real-Time Task Updates with WebSockets

**Labels:** `enhancement`, `real-time`
**Priority:** Medium

### Overview
Implement real-time task updates using WebSockets to provide instant synchronization across all connected clients when tasks are created, updated, or deleted.

### Problem Statement
Currently, users must manually refresh to see task updates made from other devices or sessions. This creates a disconnected experience, especially for users managing tasks across multiple devices (desktop, mobile, tablet).

### Proposed Solution
Implement WebSocket support using FastAPI's WebSocket capabilities and React Native's WebSocket client to provide real-time bidirectional communication.

### Technical Implementation

#### Backend (FastAPI)
1. Add WebSocket endpoint: `/ws/{user_id}`
2. Implement connection manager to track active connections per user
3. Broadcast task events (create, update, delete) to all user connections
4. Add heartbeat/ping-pong for connection health monitoring
5. Handle reconnection logic with exponential backoff

```python
# Example WebSocket manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        if user_id not in self.active_connections:
            self.active_connections[user_id] = []
        self.active_connections[user_id].append(websocket)

    async def broadcast_to_user(self, user_id: int, message: dict):
        for connection in self.active_connections.get(user_id, []):
            await connection.send_json(message)
```

#### Frontend (React Native)
1. Create WebSocket service wrapper
2. Implement auto-reconnect with exponential backoff
3. Add event listeners for task changes
4. Update local state when receiving WebSocket events
5. Add connection status indicator in UI
6. Handle offline/online transitions gracefully

### Event Types
- `task.created`: New task added
- `task.updated`: Task modified
- `task.deleted`: Task removed
- `task.completed`: Task marked as complete
- `label.added`: Label added to task

### Message Format
```json
{
  "event": "task.updated",
  "timestamp": "2025-01-14T10:30:00Z",
  "user_id": 123,
  "data": {
    "task_id": 456,
    "changes": {
      "title": "Updated title",
      "priority": "high"
    }
  }
}
```

### Security Considerations
1. Authenticate WebSocket connections using JWT token
2. Ensure users only receive events for their own tasks
3. Rate limit WebSocket messages to prevent abuse
4. Implement connection timeout (5 minutes idle)

### Acceptance Criteria
- [ ] Multiple devices show same task state in real-time
- [ ] Creating a task on device A instantly appears on device B
- [ ] Connection status indicator shows connected/disconnected state
- [ ] Auto-reconnect works after network interruption
- [ ] Performance: < 500ms latency for event propagation

### Estimated Effort
**Medium-High** - 3-5 days

---

## 2. Collaborative Task Sharing

**Labels:** `enhancement`, `collaboration`
**Priority:** High

### Overview
Enable users to share tasks and projects with other users, allowing teams to collaborate on shared work items with role-based permissions.

### Problem Statement
Currently, each user's tasks are private. There's no way for teams to collaborate on shared tasks, assign work to team members, or track collective progress.

### Proposed Solution
Implement a sharing system with workspaces, projects, and granular permissions (owner, editor, viewer).

### Technical Implementation

#### Database Schema Changes
```sql
-- Workspaces table
CREATE TABLE workspaces (
    id INTEGER PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
);

-- Workspace members
CREATE TABLE workspace_members (
    id INTEGER PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    role VARCHAR CHECK(role IN ('owner', 'editor', 'viewer')),
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Projects (groups of tasks)
CREATE TABLE projects (
    id INTEGER PRIMARY KEY,
    workspace_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (workspace_id) REFERENCES workspaces(id)
);

-- Update tasks table
ALTER TABLE tasks ADD COLUMN workspace_id INTEGER REFERENCES workspaces(id);
ALTER TABLE tasks ADD COLUMN project_id INTEGER REFERENCES projects(id);
ALTER TABLE tasks ADD COLUMN assigned_to INTEGER REFERENCES users(id);
```

#### Backend Features
1. Workspace CRUD operations
2. Member invitation system (email invites)
3. Permission middleware for shared resources
4. Activity feed for workspace changes
5. Task assignment and delegation

#### Frontend Features
1. Workspace switcher in navigation
2. Member management UI
3. Invite flow with email
4. Shared task list views
5. Assignment picker
6. Activity timeline

### Permission Levels
- **Owner**: Full control (delete workspace, manage members)
- **Editor**: Create/edit/delete tasks and projects
- **Viewer**: Read-only access to tasks

### Acceptance Criteria
- [ ] Users can create workspaces
- [ ] Users can invite others via email
- [ ] Invited users receive email notification
- [ ] Members can view shared tasks based on permissions
- [ ] Editors can modify shared tasks
- [ ] Viewers can only read tasks
- [ ] Activity feed shows who made changes
- [ ] Task assignments send notifications

### Estimated Effort
**High** - 7-10 days

---

## 3. Advanced Filtering and Search

**Labels:** `enhancement`, `search`, `ui`
**Priority:** Medium

### Overview
Implement advanced filtering and search capabilities to help users quickly find tasks by multiple criteria simultaneously.

### Problem Statement
Current task list shows all tasks without filtering options. Users with many tasks need better ways to narrow down their view.

### Proposed Solution
Add multi-criteria filtering UI with saved filter presets and search across task titles and descriptions.

### Technical Implementation

#### Backend API
```python
@router.get("/tasks/search")
async def search_tasks(
    q: Optional[str] = None,  # Full-text search query
    status: Optional[List[TaskStatus]] = None,
    priority: Optional[List[TaskPriority]] = None,
    labels: Optional[List[str]] = None,
    assigned_to: Optional[int] = None,
    due_before: Optional[datetime] = None,
    due_after: Optional[datetime] = None,
    created_before: Optional[datetime] = None,
    created_after: Optional[datetime] = None,
    sort_by: Optional[str] = "created_at",
    sort_order: Optional[str] = "desc",
    page: int = 1,
    per_page: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Build dynamic query based on filters
    query = db.query(Task).filter(Task.user_id == current_user.id)

    if q:
        query = query.filter(
            or_(
                Task.title.ilike(f"%{q}%"),
                Task.description.ilike(f"%{q}%")
            )
        )

    if status:
        query = query.filter(Task.status.in_(status))

    # ... apply other filters
    # ... apply sorting
    # ... apply pagination

    return paginate(query, page, per_page)
```

#### Frontend UI
1. Filter panel (collapsible sidebar)
2. Multi-select for status, priority, labels
3. Date range pickers for due date and created date
4. Search input with debouncing
5. Active filter chips (removable)
6. Clear all filters button
7. Save filter presets

#### Filter Presets
```typescript
interface FilterPreset {
  id: string;
  name: string;
  filters: {
    status?: TaskStatus[];
    priority?: TaskPriority[];
    labels?: string[];
    dueRange?: { start: Date; end: Date };
  };
}

// Example presets
const presets: FilterPreset[] = [
  {
    name: "Due Today",
    filters: {
      dueRange: { start: startOfDay(new Date()), end: endOfDay(new Date()) },
      status: ["TODO", "IN_PROGRESS"]
    }
  },
  {
    name: "High Priority",
    filters: {
      priority: ["HIGH", "URGENT"],
      status: ["TODO", "IN_PROGRESS"]
    }
  }
];
```

### Acceptance Criteria
- [ ] Users can filter by status (Todo, In Progress, Completed)
- [ ] Users can filter by priority (Low, Medium, High, Urgent)
- [ ] Users can filter by labels (multi-select)
- [ ] Users can filter by date ranges
- [ ] Search works across title and description
- [ ] Active filters are clearly visible
- [ ] Users can save custom filter presets
- [ ] Filter state persists across sessions
- [ ] Results update in real-time as filters change

### Estimated Effort
**Medium** - 4-6 days

---

## 4. Full-Text Search with PostgreSQL

**Labels:** `enhancement`, `database`, `search`
**Priority:** Medium

### Overview
Implement PostgreSQL full-text search to provide fast, relevant search results across task titles, descriptions, and labels.

### Problem Statement
Current ILIKE search doesn't support:
- Ranking by relevance
- Stemming (find "running" when searching "run")
- Weighted searches (title matches rank higher than description)
- Performance optimization for large datasets

### Proposed Solution
Use PostgreSQL's built-in full-text search capabilities with `tsvector` and `tsquery`.

### Technical Implementation

#### Database Migration
```sql
-- Add tsvector column to tasks table
ALTER TABLE tasks ADD COLUMN search_vector tsvector;

-- Create GIN index for fast full-text search
CREATE INDEX tasks_search_vector_idx ON tasks USING GIN(search_vector);

-- Create trigger to auto-update search_vector
CREATE FUNCTION tasks_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_search_vector_trigger
BEFORE INSERT OR UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION tasks_search_vector_update();

-- Populate existing rows
UPDATE tasks SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B');
```

#### Backend Implementation
```python
@router.get("/tasks/fulltext-search")
async def fulltext_search_tasks(
    q: str,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Convert search query to tsquery
    tsquery = func.plainto_tsquery('english', q)

    # Search with ranking
    results = db.query(
        Task,
        func.ts_rank(Task.search_vector, tsquery).label('rank')
    ).filter(
        Task.user_id == current_user.id,
        Task.search_vector.match(tsquery)
    ).order_by(
        text('rank DESC')
    ).limit(limit).all()

    return [
        {
            **TaskSchema.from_orm(task).dict(),
            'relevance_score': rank
        }
        for task, rank in results
    ]
```

### Search Features
1. **Stemming**: "running" matches "run", "runs", "ran"
2. **Ranking**: Weighted by field (title > description)
3. **Phrase search**: "project documentation" as exact phrase
4. **Boolean operators**: "urgent AND documentation"
5. **Prefix matching**: "doc*" matches "documentation", "docs"

### Performance Benchmarks
- Target: < 50ms for 10,000 tasks
- Target: < 100ms for 100,000 tasks
- GIN index should provide 10-100x speedup vs ILIKE

### Acceptance Criteria
- [ ] Search finds tasks by title and description
- [ ] Results ranked by relevance
- [ ] Stemming works ("run" finds "running")
- [ ] Phrase search supported
- [ ] Search performance < 100ms for 100k tasks
- [ ] Search highlights matched terms in UI
- [ ] Recent searches cached

### Estimated Effort
**Medium** - 3-4 days

---

## 5. Task Templates and Recurring Tasks

**Labels:** `enhancement`, `productivity`
**Priority:** High

### Overview
Allow users to create task templates for repeated workflows and set up recurring tasks that auto-create based on schedules.

### Problem Statement
Users often create similar tasks repeatedly (e.g., "Weekly team meeting prep", "Monthly expense report"). Manual recreation is tedious and error-prone.

### Proposed Solution
Two complementary features:
1. **Templates**: Save task structure as reusable template
2. **Recurring**: Auto-create tasks on schedule (daily, weekly, monthly)

### Technical Implementation

#### Database Schema
```sql
-- Task templates
CREATE TABLE task_templates (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    workspace_id INTEGER,
    name VARCHAR NOT NULL,
    title_template VARCHAR NOT NULL,
    description_template TEXT,
    priority TaskPriority,
    default_labels TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Recurring task rules
CREATE TABLE recurring_tasks (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    template_id INTEGER NOT NULL,
    recurrence_pattern VARCHAR NOT NULL, -- cron-like: "0 9 * * 1" = every Monday 9am
    next_occurrence TIMESTAMP NOT NULL,
    last_created_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    end_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (template_id) REFERENCES task_templates(id)
);
```

#### Recurrence Patterns
```python
from enum import Enum

class RecurrenceType(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    CUSTOM = "custom"  # cron expression

class RecurrenceRule:
    type: RecurrenceType
    interval: int  # every N days/weeks/months
    days_of_week: Optional[List[int]]  # 0=Monday, 6=Sunday
    day_of_month: Optional[int]  # 1-31
    time_of_day: str  # "09:00"

# Examples:
# Every weekday at 9am: RecurrenceRule(type=WEEKLY, interval=1, days_of_week=[0,1,2,3,4], time_of_day="09:00")
# 1st of every month: RecurrenceRule(type=MONTHLY, interval=1, day_of_month=1, time_of_day="09:00")
```

#### Background Job (Celery/APScheduler)
```python
# runs every hour
@scheduler.scheduled_job('cron', hour='*')
async def create_recurring_tasks():
    now = datetime.utcnow()

    # Find recurring tasks due for creation
    due_tasks = db.query(RecurringTask).filter(
        RecurringTask.is_active == True,
        RecurringTask.next_occurrence <= now
    ).all()

    for recurring in due_tasks:
        # Create task from template
        template = recurring.template
        new_task = Task(
            user_id=recurring.user_id,
            title=render_template(template.title_template, now),
            description=render_template(template.description_template, now),
            priority=template.priority,
            due_date=calculate_due_date(recurring.recurrence_pattern)
        )
        db.add(new_task)

        # Add labels
        for label_name in template.default_labels:
            label = TaskLabel(task=new_task, label_name=label_name)
            db.add(label)

        # Calculate next occurrence
        recurring.next_occurrence = calculate_next_occurrence(
            recurring.recurrence_pattern,
            now
        )
        recurring.last_created_at = now

    db.commit()
```

#### Template Variables
```
{date}         - Current date (2025-01-14)
{year}         - Current year (2025)
{month}        - Current month (January)
{week_number}  - Week number (2)
{weekday}      - Day of week (Monday)

Example:
Title: "Weekly Report - Week {week_number}"
→ "Weekly Report - Week 2"
```

### Frontend Features
1. **Template Library**: Browse and create templates
2. **Quick Create**: Create task from template with one click
3. **Recurrence Setup**: Visual cron expression builder
4. **Template Preview**: See what task will look like
5. **Manage Recurring**: List, edit, pause/resume recurring tasks

### Acceptance Criteria
- [ ] Users can save tasks as templates
- [ ] Users can create tasks from templates
- [ ] Users can set up recurring tasks
- [ ] Recurring tasks auto-create on schedule
- [ ] Users can pause/resume recurring tasks
- [ ] Template variables work correctly
- [ ] Missed occurrences handled gracefully
- [ ] Users notified when recurring task created

### Estimated Effort
**High** - 6-8 days

---

## 6. Mobile Push Notifications

**Labels:** `enhancement`, `mobile`, `notifications`
**Priority:** Medium

### Overview
Implement push notifications for mobile apps to alert users about important events like due dates, assignments, and mentions.

### Problem Statement
Users miss important task updates and deadlines because they have to actively open the app to check.

### Proposed Solution
Integrate Firebase Cloud Messaging (FCM) for cross-platform push notifications with customizable notification preferences.

### Technical Implementation

#### Dependencies
```bash
# Backend
pip install firebase-admin

# React Native
npm install @react-native-firebase/app
npm install @react-native-firebase/messaging
```

#### Backend Setup
```python
# Initialize Firebase Admin SDK
import firebase_admin
from firebase_admin import credentials, messaging

cred = credentials.Certificate("path/to/serviceAccountKey.json")
firebase_admin.initialize_app(cred)

# Store device tokens
class DeviceToken(Base):
    id: int
    user_id: int
    token: str
    device_type: str  # 'ios' | 'android'
    created_at: datetime

# Send notification
async def send_push_notification(
    user_id: int,
    title: str,
    body: str,
    data: dict = None
):
    tokens = db.query(DeviceToken).filter(
        DeviceToken.user_id == user_id
    ).all()

    for token in tokens:
        message = messaging.Message(
            notification=messaging.Notification(
                title=title,
                body=body
            ),
            data=data or {},
            token=token.token
        )

        try:
            messaging.send(message)
        except Exception as e:
            # Remove invalid tokens
            if "invalid-registration-token" in str(e):
                db.delete(token)
                db.commit()
```

#### Notification Types
1. **Task Due Soon**: 1 hour before due date
2. **Task Overdue**: Daily reminder for overdue tasks
3. **Task Assigned**: When someone assigns you a task
4. **Task Completed**: When collaborator completes shared task
5. **Mention**: When someone mentions you in task description
6. **Reminder**: Custom user-set reminders

#### Frontend Implementation
```typescript
// Request permission
import messaging from '@react-native-firebase/messaging';

async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    // Get FCM token
    const token = await messaging().getToken();
    // Send token to backend
    await api.registerDeviceToken(token);
  }
}

// Handle foreground notifications
messaging().onMessage(async remoteMessage => {
  // Show in-app notification
  showInAppNotification(remoteMessage);
});

// Handle background/quit state notifications
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('Message handled in background:', remoteMessage);
});
```

#### Notification Preferences
```typescript
interface NotificationSettings {
  task_due_soon: boolean;
  task_overdue: boolean;
  task_assigned: boolean;
  task_completed: boolean;
  mentions: boolean;
  reminders: boolean;
  quiet_hours: {
    enabled: boolean;
    start: string;  // "22:00"
    end: string;    // "08:00"
  };
}
```

### Acceptance Criteria
- [ ] Users can enable/disable push notifications
- [ ] Notifications sent for task due in 1 hour
- [ ] Notifications sent for overdue tasks
- [ ] Notifications sent when assigned task
- [ ] Tapping notification opens relevant task
- [ ] Users can customize notification preferences
- [ ] Quiet hours respected
- [ ] Notification badge count accurate
- [ ] Works on both iOS and Android

### Estimated Effort
**Medium-High** - 4-6 days

---

## 7. Calendar Integration

**Labels:** `enhancement`, `integration`, `calendar`
**Priority:** Medium

### Overview
Integrate with Google Calendar and Apple Calendar to sync tasks with due dates as calendar events.

### Problem Statement
Users manage both tasks (in TasksAI) and events (in calendar apps) separately, creating duplication and risk of missed deadlines.

### Proposed Solution
Two-way sync with Google Calendar and iCal format export for Apple Calendar.

### Technical Implementation

#### Google Calendar Integration

##### Backend Setup
```python
# OAuth2 setup
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

class CalendarIntegration(Base):
    id: int
    user_id: int
    provider: str  # 'google' | 'apple'
    access_token: str  # encrypted
    refresh_token: str  # encrypted
    token_expiry: datetime
    calendar_id: str
    sync_enabled: bool
    last_sync: datetime

# Create calendar event from task
async def sync_task_to_calendar(task: Task, user: User):
    integration = get_calendar_integration(user.id)
    credentials = Credentials(
        token=decrypt(integration.access_token),
        refresh_token=decrypt(integration.refresh_token),
        token_uri='https://oauth2.googleapis.com/token',
        client_id=settings.GOOGLE_CLIENT_ID,
        client_secret=settings.GOOGLE_CLIENT_SECRET
    )

    service = build('calendar', 'v3', credentials=credentials)

    event = {
        'summary': task.title,
        'description': task.description,
        'start': {
            'dateTime': task.due_date.isoformat(),
            'timeZone': 'UTC',
        },
        'end': {
            'dateTime': (task.due_date + timedelta(hours=1)).isoformat(),
            'timeZone': 'UTC',
        },
        'extendedProperties': {
            'private': {
                'tasksai_task_id': str(task.id)
            }
        }
    }

    result = service.events().insert(
        calendarId=integration.calendar_id,
        body=event
    ).execute()

    # Store event ID for future updates
    task.calendar_event_id = result['id']
```

##### Sync Strategy
```python
# Bidirectional sync every 15 minutes
@scheduler.scheduled_job('cron', minute='*/15')
async def sync_calendars():
    integrations = db.query(CalendarIntegration).filter(
        CalendarIntegration.sync_enabled == True
    ).all()

    for integration in integrations:
        # Sync TasksAI → Calendar
        tasks_changed = db.query(Task).filter(
            Task.user_id == integration.user_id,
            Task.updated_at > integration.last_sync,
            Task.due_date.isnot(None)
        ).all()

        for task in tasks_changed:
            if task.calendar_event_id:
                update_calendar_event(task, integration)
            else:
                create_calendar_event(task, integration)

        # Sync Calendar → TasksAI
        events_changed = fetch_calendar_events_since(
            integration,
            integration.last_sync
        )

        for event in events_changed:
            task_id = event.get('extendedProperties', {}).get('private', {}).get('tasksai_task_id')
            if task_id:
                update_task_from_event(task_id, event)

        integration.last_sync = datetime.utcnow()

    db.commit()
```

#### iCal Export
```python
# Generate .ics file
from icalendar import Calendar, Event

@router.get("/tasks/export/ical")
async def export_tasks_ical(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.due_date.isnot(None)
    ).all()

    cal = Calendar()
    cal.add('prodid', '-//TasksAI//tasksai.com//')
    cal.add('version', '2.0')
    cal.add('calscale', 'GREGORIAN')
    cal.add('method', 'PUBLISH')
    cal.add('x-wr-calname', 'TasksAI Tasks')

    for task in tasks:
        event = Event()
        event.add('summary', task.title)
        event.add('description', task.description)
        event.add('dtstart', task.due_date)
        event.add('dtend', task.due_date + timedelta(hours=1))
        event.add('dtstamp', task.created_at)
        event.add('uid', f'task-{task.id}@tasksai.com')
        event.add('status', 'CONFIRMED' if task.status == 'COMPLETED' else 'TENTATIVE')
        cal.add_component(event)

    return Response(
        content=cal.to_ical(),
        media_type='text/calendar',
        headers={'Content-Disposition': 'attachment; filename=tasksai.ics'}
    )
```

#### Frontend Features
1. **Connect Calendar**: OAuth flow for Google Calendar
2. **Sync Settings**: Choose which tasks to sync (all vs. specific labels)
3. **Sync Status**: Show last sync time and status
4. **Export iCal**: Download .ics file for Apple Calendar
5. **Disconnect**: Revoke access and remove synced events

### Acceptance Criteria
- [ ] Users can connect Google Calendar via OAuth
- [ ] Tasks with due dates sync to calendar as events
- [ ] Updating task in TasksAI updates calendar event
- [ ] Updating event in calendar updates task in TasksAI
- [ ] Completing task marks calendar event as completed
- [ ] Users can export .ics file for Apple Calendar
- [ ] Sync conflicts handled gracefully (last-write-wins)
- [ ] Users can disconnect calendar integration
- [ ] Disconnecting removes synced events

### Estimated Effort
**High** - 7-9 days

---

## 8. Pagination for Task Listing

**Labels:** `enhancement`, `performance`, `api`
**Priority:** High

### Overview
Implement cursor-based pagination for task listing to improve performance and scalability as users accumulate thousands of tasks.

### Problem Statement
Current API returns all tasks at once, which:
- Slows down response time for users with many tasks
- Wastes bandwidth loading tasks user won't see
- Risks timeout errors with very large datasets
- Poor mobile experience on slow connections

### Proposed Solution
Implement cursor-based pagination with configurable page size, infinite scroll on mobile, and traditional pagination on web.

### Technical Implementation

#### Backend API
```python
from typing import Optional, Generic, TypeVar
from pydantic import BaseModel

T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    data: List[T]
    pagination: dict

class TaskPagination:
    @staticmethod
    def paginate_tasks(
        db: Session,
        user_id: int,
        cursor: Optional[int] = None,  # Last task ID from previous page
        limit: int = 50,
        sort_by: str = 'created_at',
        sort_order: str = 'desc'
    ):
        # Base query
        query = db.query(Task).filter(Task.user_id == user_id)

        # Apply cursor (for next page)
        if cursor:
            if sort_order == 'desc':
                query = query.filter(Task.id < cursor)
            else:
                query = query.filter(Task.id > cursor)

        # Apply sorting
        sort_column = getattr(Task, sort_by)
        if sort_order == 'desc':
            query = query.order_by(sort_column.desc(), Task.id.desc())
        else:
            query = query.order_by(sort_column.asc(), Task.id.asc())

        # Fetch limit + 1 to check if there are more
        tasks = query.limit(limit + 1).all()

        # Determine if there are more results
        has_more = len(tasks) > limit
        if has_more:
            tasks = tasks[:limit]

        # Get next cursor (ID of last item)
        next_cursor = tasks[-1].id if has_more and tasks else None

        return PaginatedResponse(
            data=[TaskSchema.from_orm(task) for task in tasks],
            pagination={
                'next_cursor': next_cursor,
                'has_more': has_more,
                'limit': limit,
                'count': len(tasks)
            }
        )

@router.get("/tasks", response_model=PaginatedResponse[TaskSchema])
async def list_tasks(
    cursor: Optional[int] = None,
    limit: int = Query(50, le=100),  # Max 100 per page
    sort_by: str = 'created_at',
    sort_order: str = 'desc',
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    return TaskPagination.paginate_tasks(
        db=db,
        user_id=current_user.id,
        cursor=cursor,
        limit=limit,
        sort_by=sort_by,
        sort_order=sort_order
    )
```

#### Frontend Implementation

##### Mobile (Infinite Scroll)
```typescript
const TaskList = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (loading || !hasMore) return;

    setLoading(true);
    const response = await api.getTasks({ cursor, limit: 20 });

    setTasks(prev => [...prev, ...response.data]);
    setCursor(response.pagination.next_cursor);
    setHasMore(response.pagination.has_more);
    setLoading(false);
  };

  return (
    <FlatList
      data={tasks}
      renderItem={({ item }) => <TaskItem task={item} />}
      onEndReached={loadMore}
      onEndReachedThreshold={0.5}
      ListFooterComponent={loading ? <LoadingSpinner /> : null}
    />
  );
};
```

##### Web (Traditional Pagination)
```typescript
const TaskTable = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  const loadPage = async (pageNum: number) => {
    // Calculate cursor from page number
    const cursor = pageNum > 1 ? (pageNum - 1) * limit : null;
    const response = await api.getTasks({ cursor, limit });

    setTasks(response.data);
    setPage(pageNum);
  };

  return (
    <>
      <TaskTable data={tasks} />
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={loadPage}
      />
    </>
  );
};
```

### Caching Strategy
```typescript
// React Query for smart caching
const useTasks = (cursor: number | null, limit: number) => {
  return useQuery(
    ['tasks', cursor, limit],
    () => api.getTasks({ cursor, limit }),
    {
      keepPreviousData: true,  // Keep old data while fetching new
      staleTime: 30000,  // Data fresh for 30 seconds
      cacheTime: 300000,  // Cache for 5 minutes
    }
  );
};
```

### Performance Benchmarks
| Tasks Count | Without Pagination | With Pagination (50/page) |
|-------------|-------------------|---------------------------|
| 100         | 120ms             | 45ms                      |
| 1,000       | 850ms             | 50ms                      |
| 10,000      | 8,500ms           | 55ms                      |
| 100,000     | Timeout           | 60ms                      |

### Acceptance Criteria
- [ ] API returns paginated results with cursor
- [ ] Mobile app uses infinite scroll
- [ ] Desktop app uses traditional pagination
- [ ] Cursor-based pagination works with sorting
- [ ] Initial load shows first 50 tasks
- [ ] Loading indicator shows during fetch
- [ ] No duplicate tasks when paginating
- [ ] Performance < 100ms for any page size

### Estimated Effort
**Medium** - 3-4 days

---

## 9. Smart Task Scheduling (AI)

**Labels:** `enhancement`, `ai`, `productivity`
**Priority:** Low

### Overview
Use machine learning to suggest optimal task scheduling based on user patterns, task complexity, and historical completion times.

### Problem Statement
Users struggle to:
- Estimate how long tasks will take
- Prioritize tasks effectively
- Schedule tasks at optimal times of day
- Balance workload across days/weeks

### Proposed Solution
Build ML models to analyze user behavior and provide intelligent suggestions for task scheduling and time estimation.

### Technical Implementation

#### Data Collection
```python
class TaskAnalytics(Base):
    id: int
    task_id: int
    user_id: int

    # Time tracking
    created_at: datetime
    first_started_at: Optional[datetime]
    completed_at: Optional[datetime]
    actual_duration_minutes: Optional[int]
    estimated_duration_minutes: Optional[int]

    # Context
    hour_of_day_created: int
    day_of_week_created: int
    hour_of_day_completed: Optional[int]
    day_of_week_completed: Optional[int]

    # Task attributes
    title_length: int
    description_length: int
    priority: TaskPriority
    complexity_score: Optional[float]  # 0-1

    # Interruptions
    times_postponed: int
    times_reopened: int
```

#### ML Models

##### 1. Duration Estimation Model
```python
from sklearn.ensemble import RandomForestRegressor
import pandas as pd

class DurationPredictor:
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100)

    def prepare_features(self, task: Task) -> pd.DataFrame:
        return pd.DataFrame([{
            'title_length': len(task.title),
            'description_length': len(task.description or ''),
            'priority': task.priority.value,
            'has_labels': len(task.labels) > 0,
            'label_count': len(task.labels),
            'hour_of_day': datetime.now().hour,
            'day_of_week': datetime.now().weekday(),
            # User-specific features
            'avg_task_duration': self.get_user_avg_duration(task.user_id),
            'completion_rate': self.get_user_completion_rate(task.user_id),
        }])

    def train(self, historical_data: List[TaskAnalytics]):
        X = pd.DataFrame([
            self.prepare_features(analytics)
            for analytics in historical_data
        ])
        y = [a.actual_duration_minutes for a in historical_data]

        self.model.fit(X, y)

    def predict(self, task: Task) -> int:
        """Predict task duration in minutes"""
        features = self.prepare_features(task)
        predicted_minutes = self.model.predict(features)[0]
        return int(predicted_minutes)
```

##### 2. Optimal Time Predictor
```python
class OptimalTimePredictor:
    """Suggest best time of day to work on task"""

    def analyze_user_patterns(self, user_id: int):
        # Find when user is most productive for different task types
        analytics = db.query(TaskAnalytics).filter(
            TaskAnalytics.user_id == user_id,
            TaskAnalytics.completed_at.isnot(None)
        ).all()

        # Group by hour and calculate completion rate
        hourly_stats = defaultdict(list)
        for a in analytics:
            hour = a.hour_of_day_completed
            duration = a.actual_duration_minutes
            estimated = a.estimated_duration_minutes or duration
            efficiency = estimated / duration if duration > 0 else 1.0

            hourly_stats[hour].append({
                'efficiency': efficiency,
                'priority': a.priority,
                'complexity': a.complexity_score
            })

        return hourly_stats

    def suggest_schedule(self, tasks: List[Task], user_id: int):
        patterns = self.analyze_user_patterns(user_id)
        suggestions = []

        for task in tasks:
            # Find best hours for this type of task
            best_hours = sorted(
                patterns.keys(),
                key=lambda h: self._score_hour(h, task, patterns[h]),
                reverse=True
            )[:3]

            suggestions.append({
                'task_id': task.id,
                'suggested_hours': best_hours,
                'reason': self._explain_suggestion(task, best_hours, patterns)
            })

        return suggestions
```

##### 3. Priority Recommender
```python
class PriorityRecommender:
    """Suggest task priorities based on patterns"""

    def recommend_priority(self, task: Task, user_id: int) -> TaskPriority:
        # Analyze similar tasks
        similar_tasks = self.find_similar_tasks(task, user_id)

        # Calculate priority based on:
        # 1. Historical priority of similar tasks
        # 2. Due date proximity
        # 3. User's completion patterns
        # 4. Task complexity

        priority_scores = {
            TaskPriority.LOW: 0,
            TaskPriority.MEDIUM: 0,
            TaskPriority.HIGH: 0,
            TaskPriority.URGENT: 0
        }

        # Weight by similarity
        for similar, similarity in similar_tasks:
            priority_scores[similar.priority] += similarity

        # Adjust for due date
        if task.due_date:
            days_until_due = (task.due_date - datetime.now()).days
            if days_until_due <= 1:
                priority_scores[TaskPriority.URGENT] += 2.0
            elif days_until_due <= 3:
                priority_scores[TaskPriority.HIGH] += 1.5

        recommended = max(priority_scores, key=priority_scores.get)
        confidence = priority_scores[recommended] / sum(priority_scores.values())

        return recommended, confidence
```

#### API Endpoints
```python
@router.get("/tasks/{task_id}/ai-suggestions")
async def get_ai_suggestions(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    task = db.query(Task).filter(
        Task.id == task_id,
        Task.user_id == current_user.id
    ).first()

    duration_predictor = DurationPredictor()
    time_predictor = OptimalTimePredictor()
    priority_recommender = PriorityRecommender()

    return {
        'estimated_duration_minutes': duration_predictor.predict(task),
        'optimal_times': time_predictor.suggest_schedule([task], current_user.id)[0],
        'suggested_priority': priority_recommender.recommend_priority(task, current_user.id),
        'confidence_scores': {
            'duration': 0.85,
            'timing': 0.72,
            'priority': 0.68
        }
    }

@router.get("/ai/daily-schedule")
async def generate_daily_schedule(
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Generate optimal daily task schedule"""
    # Get all incomplete tasks
    tasks = db.query(Task).filter(
        Task.user_id == current_user.id,
        Task.status != TaskStatus.COMPLETED
    ).all()

    # Predict durations
    duration_predictor = DurationPredictor()
    for task in tasks:
        task.estimated_duration = duration_predictor.predict(task)

    # Generate schedule
    time_predictor = OptimalTimePredictor()
    schedule = time_predictor.suggest_schedule(tasks, current_user.id)

    return {
        'date': date or datetime.now().date().isoformat(),
        'total_tasks': len(tasks),
        'total_estimated_hours': sum(t.estimated_duration for t in tasks) / 60,
        'schedule': schedule,
        'recommendations': [
            'Focus on high-priority tasks in the morning (your peak productivity time)',
            'Take breaks between complex tasks',
            'Schedule quick wins in the afternoon for momentum'
        ]
    }
```

#### Frontend Features
1. **AI Badge**: Show AI suggestions on task cards
2. **Schedule View**: Visual daily schedule with AI-suggested times
3. **Duration Estimates**: Show predicted completion time
4. **Priority Suggestions**: Highlight AI-recommended priority
5. **Insights**: Dashboard showing productivity patterns

### Model Training
```python
# Train models daily with new data
@scheduler.scheduled_job('cron', hour='2')
async def retrain_models():
    # Get all users with sufficient data (>50 completed tasks)
    users = db.query(User).join(Task).group_by(User.id).having(
        func.count(Task.id) > 50
    ).all()

    for user in users:
        analytics = db.query(TaskAnalytics).filter(
            TaskAnalytics.user_id == user.id,
            TaskAnalytics.completed_at.isnot(None)
        ).all()

        # Train duration model
        duration_model = DurationPredictor()
        duration_model.train(analytics)
        save_model(duration_model, f'duration_{user.id}.pkl')

        # Train other models...
```

### Privacy & Ethics
1. All ML models trained per-user (no cross-user data)
2. Users can opt-out of AI features
3. Suggestions are non-binding (user has final control)
4. Clear explanation of how suggestions are made
5. Option to delete all analytics data

### Acceptance Criteria
- [ ] Duration predictions within 20% accuracy
- [ ] Optimal time suggestions improve completion rate by 15%
- [ ] Priority recommendations accepted 60%+ of the time
- [ ] Daily schedule generation < 2 seconds
- [ ] Models retrain automatically with new data
- [ ] Users can view explanation for each suggestion
- [ ] Users can opt-out of AI features

### Estimated Effort
**Very High** - 10-14 days

---

## 10. Productivity Analytics Dashboard

**Labels:** `enhancement`, `analytics`, `visualization`
**Priority:** Medium

### Overview
Build a comprehensive analytics dashboard showing productivity metrics, trends, and insights about task completion patterns.

### Problem Statement
Users lack visibility into their productivity patterns:
- How many tasks completed this week vs. last week?
- Which categories take the most time?
- Are overdue tasks increasing?
- What's the completion rate by priority?

### Proposed Solution
Create an analytics dashboard with interactive charts showing key metrics, trends, and personalized insights.

### Technical Implementation

#### Backend Analytics Service
```python
from datetime import datetime, timedelta
from sqlalchemy import func, case

class ProductivityAnalytics:
    def __init__(self, db: Session, user_id: int):
        self.db = db
        self.user_id = user_id

    def get_completion_stats(self, days: int = 30):
        """Get task completion statistics"""
        start_date = datetime.utcnow() - timedelta(days=days)

        stats = self.db.query(
            func.count(Task.id).label('total_tasks'),
            func.sum(case((Task.status == TaskStatus.COMPLETED, 1), else_=0)).label('completed'),
            func.sum(case((Task.status == TaskStatus.IN_PROGRESS, 1), else_=0)).label('in_progress'),
            func.sum(case((Task.status == TaskStatus.TODO, 1), else_=0)).label('todo'),
        ).filter(
            Task.user_id == self.user_id,
            Task.created_at >= start_date
        ).first()

        completion_rate = (stats.completed / stats.total_tasks * 100) if stats.total_tasks > 0 else 0

        return {
            'total_tasks': stats.total_tasks,
            'completed': stats.completed,
            'in_progress': stats.in_progress,
            'todo': stats.todo,
            'completion_rate': round(completion_rate, 1)
        }

    def get_completion_trend(self, days: int = 30):
        """Get daily completion trend"""
        start_date = datetime.utcnow() - timedelta(days=days)

        daily_stats = self.db.query(
            func.date(Task.completed_at).label('date'),
            func.count(Task.id).label('count')
        ).filter(
            Task.user_id == self.user_id,
            Task.status == TaskStatus.COMPLETED,
            Task.completed_at >= start_date
        ).group_by(
            func.date(Task.completed_at)
        ).order_by('date').all()

        return [
            {'date': str(stat.date), 'completed': stat.count}
            for stat in daily_stats
        ]

    def get_priority_distribution(self):
        """Get tasks distribution by priority"""
        distribution = self.db.query(
            Task.priority,
            func.count(Task.id).label('count')
        ).filter(
            Task.user_id == self.user_id,
            Task.status != TaskStatus.COMPLETED
        ).group_by(Task.priority).all()

        return {
            priority.value: count
            for priority, count in distribution
        }

    def get_category_time_spent(self):
        """Get time spent per category (based on labels)"""
        category_stats = self.db.query(
            TaskLabel.label_category,
            func.count(TaskLabel.id).label('task_count'),
            func.avg(TaskAnalytics.actual_duration_minutes).label('avg_duration')
        ).join(
            Task, TaskLabel.task_id == Task.id
        ).join(
            TaskAnalytics, Task.id == TaskAnalytics.task_id
        ).filter(
            Task.user_id == self.user_id,
            TaskAnalytics.completed_at.isnot(None)
        ).group_by(
            TaskLabel.label_category
        ).all()

        return [
            {
                'category': stat.label_category.value,
                'task_count': stat.task_count,
                'avg_duration_minutes': round(stat.avg_duration, 1),
                'total_hours': round(stat.task_count * stat.avg_duration / 60, 1)
            }
            for stat in category_stats
        ]

    def get_overdue_analysis(self):
        """Analyze overdue tasks"""
        now = datetime.utcnow()

        overdue_tasks = self.db.query(Task).filter(
            Task.user_id == self.user_id,
            Task.status != TaskStatus.COMPLETED,
            Task.due_date < now
        ).all()

        return {
            'total_overdue': len(overdue_tasks),
            'by_priority': {
                priority.value: len([t for t in overdue_tasks if t.priority == priority])
                for priority in TaskPriority
            },
            'oldest_overdue': min(
                [t.due_date for t in overdue_tasks],
                default=None
            ),
            'avg_days_overdue': sum(
                [(now - t.due_date).days for t in overdue_tasks]
            ) / len(overdue_tasks) if overdue_tasks else 0
        }

    def get_productivity_score(self, days: int = 7):
        """Calculate overall productivity score (0-100)"""
        stats = self.get_completion_stats(days)
        overdue = self.get_overdue_analysis()

        # Factors:
        # 1. Completion rate (40 points)
        completion_score = stats['completion_rate'] * 0.4

        # 2. Overdue penalty (30 points)
        overdue_penalty = min(overdue['total_overdue'] * 3, 30)
        overdue_score = 30 - overdue_penalty

        # 3. Consistency (30 points) - based on daily completion trend
        trend = self.get_completion_trend(days)
        daily_avg = sum(d['completed'] for d in trend) / len(trend) if trend else 0
        consistency_score = min(daily_avg * 10, 30)

        total_score = completion_score + overdue_score + consistency_score

        return {
            'score': round(total_score, 1),
            'breakdown': {
                'completion': round(completion_score, 1),
                'overdue': round(overdue_score, 1),
                'consistency': round(consistency_score, 1)
            },
            'grade': self._score_to_grade(total_score)
        }

    def _score_to_grade(self, score: float) -> str:
        if score >= 90:
            return 'A+'
        elif score >= 80:
            return 'A'
        elif score >= 70:
            return 'B'
        elif score >= 60:
            return 'C'
        else:
            return 'D'

    def get_insights(self):
        """Generate personalized insights"""
        insights = []

        # Check completion rate trend
        current_week = self.get_completion_stats(7)
        last_week = self.get_completion_stats(14)

        if current_week['completion_rate'] > last_week['completion_rate']:
            insights.append({
                'type': 'positive',
                'message': f"Great job! Your completion rate improved from {last_week['completion_rate']}% to {current_week['completion_rate']}% this week.",
                'icon': '📈'
            })
        elif current_week['completion_rate'] < last_week['completion_rate']:
            insights.append({
                'type': 'warning',
                'message': f"Your completion rate decreased from {last_week['completion_rate']}% to {current_week['completion_rate']}% this week. Consider reviewing your task priorities.",
                'icon': '📉'
            })

        # Check overdue tasks
        overdue = self.get_overdue_analysis()
        if overdue['total_overdue'] > 5:
            insights.append({
                'type': 'alert',
                'message': f"You have {overdue['total_overdue']} overdue tasks. Consider rescheduling or breaking them into smaller tasks.",
                'icon': '⚠️'
            })

        # Check most time-consuming category
        categories = self.get_category_time_spent()
        if categories:
            top_category = max(categories, key=lambda x: x['total_hours'])
            insights.append({
                'type': 'info',
                'message': f"You spend most of your time on {top_category['category']} tasks ({top_category['total_hours']} hours total).",
                'icon': '💡'
            })

        return insights

# API Endpoints
@router.get("/analytics/dashboard")
async def get_analytics_dashboard(
    days: int = Query(30, ge=7, le=365),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    analytics = ProductivityAnalytics(db, current_user.id)

    return {
        'completion_stats': analytics.get_completion_stats(days),
        'completion_trend': analytics.get_completion_trend(days),
        'priority_distribution': analytics.get_priority_distribution(),
        'category_breakdown': analytics.get_category_time_spent(),
        'overdue_analysis': analytics.get_overdue_analysis(),
        'productivity_score': analytics.get_productivity_score(7),
        'insights': analytics.get_insights()
    }

@router.get("/analytics/export")
async def export_analytics(
    format: str = Query('csv', regex='^(csv|json|pdf)$'),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Export analytics data"""
    analytics = ProductivityAnalytics(db, current_user.id)
    data = analytics.get_analytics_dashboard()

    if format == 'csv':
        # Convert to CSV
        pass
    elif format == 'json':
        return data
    elif format == 'pdf':
        # Generate PDF report
        pass
```

#### Frontend Dashboard
```typescript
// Dashboard Components
const AnalyticsDashboard = () => {
  const { data, isLoading } = useQuery('analytics', fetchAnalytics);

  return (
    <ScrollView>
      {/* Header with Productivity Score */}
      <ProductivityScoreCard score={data.productivity_score} />

      {/* Key Metrics */}
      <MetricsRow>
        <MetricCard
          title="Completion Rate"
          value={`${data.completion_stats.completion_rate}%`}
          trend={data.completion_trend}
          icon="✅"
        />
        <MetricCard
          title="Overdue Tasks"
          value={data.overdue_analysis.total_overdue}
          status={data.overdue_analysis.total_overdue > 0 ? 'warning' : 'success'}
          icon="⏰"
        />
      </MetricsRow>

      {/* Completion Trend Chart */}
      <ChartCard title="Completion Trend (30 days)">
        <LineChart
          data={data.completion_trend}
          xKey="date"
          yKey="completed"
        />
      </ChartCard>

      {/* Priority Distribution */}
      <ChartCard title="Tasks by Priority">
        <PieChart
          data={Object.entries(data.priority_distribution).map(([key, value]) => ({
            label: key,
            value
          }))}
        />
      </ChartCard>

      {/* Category Breakdown */}
      <ChartCard title="Time Spent by Category">
        <BarChart
          data={data.category_breakdown}
          xKey="category"
          yKey="total_hours"
        />
      </ChartCard>

      {/* Personalized Insights */}
      <InsightsCard insights={data.insights} />

      {/* Export Options */}
      <ExportButton formats={['CSV', 'JSON', 'PDF']} />
    </ScrollView>
  );
};

// Productivity Score Component
const ProductivityScoreCard = ({ score }) => {
  const scoreColor = score.score >= 80 ? 'green' : score.score >= 60 ? 'yellow' : 'red';

  return (
    <Card>
      <CircularProgress
        value={score.score}
        color={scoreColor}
        size={120}
      />
      <Text style={styles.grade}>{score.grade}</Text>
      <Text style={styles.label}>Productivity Score</Text>

      <ScoreBreakdown>
        <BreakdownItem label="Completion" value={score.breakdown.completion} />
        <BreakdownItem label="On-Time" value={score.breakdown.overdue} />
        <BreakdownItem label="Consistency" value={score.breakdown.consistency} />
      </ScoreBreakdown>
    </Card>
  );
};
```

### Chart Library
```bash
npm install react-native-chart-kit
# or
npm install victory-native
```

### Acceptance Criteria
- [ ] Dashboard shows completion rate for last 30 days
- [ ] Line chart shows daily completion trend
- [ ] Pie chart shows priority distribution
- [ ] Bar chart shows time spent by category
- [ ] Productivity score calculated and displayed
- [ ] Personalized insights generated
- [ ] Data can be exported to CSV/JSON/PDF
- [ ] Dashboard loads in < 2 seconds
- [ ] Charts are interactive and responsive
- [ ] Metrics update in real-time

### Estimated Effort
**Medium-High** - 5-7 days

---

## 11. Offline Mode with Sync

**Labels:** `enhancement`, `mobile`, `offline`
**Priority:** High

### Overview
Enable full offline functionality for the mobile app with automatic sync when connection is restored.

### Problem Statement
Current app requires internet connection for all operations. Users lose access to their tasks when:
- In areas with poor connectivity (subway, airplane, rural areas)
- On metered connections (want to avoid data usage)
- Network outages or server downtime

### Proposed Solution
Implement local-first architecture with SQLite on-device storage, conflict resolution for concurrent changes, and bidirectional sync.

### Technical Implementation

#### Local Database (SQLite)
```typescript
// Using WatermelonDB for React Native offline-first database
import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';

// Define local schema
const schema = appSchema({
  version: 1,
  tables: [
    tableSchema({
      name: 'tasks',
      columns: [
        { name: 'title', type: 'string' },
        { name: 'description', type: 'string', isOptional: true },
        { name: 'priority', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'due_date', type: 'number', isOptional: true },
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true },
        { name: 'updated_at', type: 'number' },
        { name: 'created_at', type: 'number' },
        { name: 'is_deleted', type: 'boolean' }
      ]
    }),
    tableSchema({
      name: 'labels',
      columns: [
        { name: 'task_id', type: 'string', isIndexed: true },
        { name: 'label_name', type: 'string' },
        { name: 'label_category', type: 'string' },
        { name: 'confidence_score', type: 'number', isOptional: true },
        { name: 'server_id', type: 'number', isOptional: true },
        { name: 'synced_at', type: 'number', isOptional: true }
      ]
    }),
    tableSchema({
      name: 'sync_queue',
      columns: [
        { name: 'operation', type: 'string' },  // 'create' | 'update' | 'delete'
        { name: 'entity_type', type: 'string' },  // 'task' | 'label'
        { name: 'entity_id', type: 'string' },
        { name: 'payload', type: 'string' },  // JSON
        { name: 'retry_count', type: 'number' },
        { name: 'created_at', type: 'number' }
      ]
    })
  ]
});

// Initialize database
const adapter = new SQLiteAdapter({
  schema,
  dbName: 'tasksai'
});

const database = new Database({
  adapter,
  modelClasses: [Task, Label, SyncQueueItem]
});
```

#### Sync Service
```typescript
class SyncService {
  private db: Database;
  private api: ApiClient;
  private isSyncing: boolean = false;

  constructor(db: Database, api: ApiClient) {
    this.db = db;
    this.api = api;

    // Listen for network state changes
    NetInfo.addEventListener(state => {
      if (state.isConnected && !this.isSyncing) {
        this.performSync();
      }
    });
  }

  async performSync() {
    if (this.isSyncing) return;

    try {
      this.isSyncing = true;

      // Step 1: Push local changes to server
      await this.pushLocalChanges();

      // Step 2: Pull server changes
      await this.pullServerChanges();

      // Step 3: Resolve conflicts
      await this.resolveConflicts();

      console.log('Sync completed successfully');
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async pushLocalChanges() {
    const queue = await this.db.collections
      .get('sync_queue')
      .query()
      .fetch();

    for (const item of queue) {
      try {
        const payload = JSON.parse(item.payload);

        switch (item.operation) {
          case 'create':
            const created = await this.api.createTask(payload);
            await this.updateLocalWithServerId(item.entity_id, created.id);
            break;

          case 'update':
            await this.api.updateTask(payload.server_id, payload);
            break;

          case 'delete':
            await this.api.deleteTask(payload.server_id);
            break;
        }

        // Remove from queue on success
        await item.destroyPermanently();
      } catch (error) {
        // Increment retry count
        await item.update(i => {
          i.retry_count += 1;
        });

        // Remove if too many retries
        if (item.retry_count > 5) {
          await item.destroyPermanently();
          console.error('Max retries exceeded for sync item:', item.id);
        }
      }
    }
  }

  async pullServerChanges() {
    const lastSyncTime = await this.getLastSyncTime();

    // Get changes since last sync
    const changes = await this.api.getChangesSince(lastSyncTime);

    await this.db.write(async () => {
      for (const change of changes.tasks) {
        await this.applyServerChange('tasks', change);
      }

      for (const change of changes.labels) {
        await this.applyServerChange('labels', change);
      }
    });

    await this.setLastSyncTime(new Date());
  }

  async applyServerChange(collection: string, change: any) {
    const localRecord = await this.db.collections
      .get(collection)
      .find(change.id)
      .catch(() => null);

    if (change.deleted) {
      if (localRecord) {
        await localRecord.markAsDeleted();
      }
    } else if (localRecord) {
      // Update existing
      await localRecord.update(record => {
        Object.assign(record, change);
        record.synced_at = Date.now();
      });
    } else {
      // Create new
      await this.db.collections.get(collection).create(record => {
        Object.assign(record, change);
        record.synced_at = Date.now();
      });
    }
  }

  async resolveConflicts() {
    // Find records with both local and server changes
    const conflicts = await this.db.collections
      .get('tasks')
      .query(
        Q.where('updated_at', Q.gt(Q.column('synced_at')))
      )
      .fetch();

    for (const local of conflicts) {
      if (!local.server_id) continue;

      // Get server version
      const server = await this.api.getTask(local.server_id);

      // Conflict resolution strategy: Last Write Wins
      if (server.updated_at > local.updated_at) {
        // Server wins
        await local.update(record => {
          Object.assign(record, server);
          record.synced_at = Date.now();
        });
      } else {
        // Local wins - push to server
        await this.api.updateTask(local.server_id, local._raw);
        await local.update(record => {
          record.synced_at = Date.now();
        });
      }
    }
  }

  async queueOperation(
    operation: 'create' | 'update' | 'delete',
    entityType: 'task' | 'label',
    entityId: string,
    payload: any
  ) {
    await this.db.write(async () => {
      await this.db.collections.get('sync_queue').create(item => {
        item.operation = operation;
        item.entity_type = entityType;
        item.entity_id = entityId;
        item.payload = JSON.stringify(payload);
        item.retry_count = 0;
        item.created_at = Date.now();
      });
    });
  }
}
```

#### Backend Changes
```python
# Add change tracking
class TaskChange(Base):
    id: int
    task_id: int
    user_id: int
    operation: str  # 'create' | 'update' | 'delete'
    changed_at: datetime
    changes: dict  # JSON field with changed fields

# Endpoint to get changes since timestamp
@router.get("/sync/changes")
async def get_changes_since(
    since: datetime,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    changes = db.query(TaskChange).filter(
        TaskChange.user_id == current_user.id,
        TaskChange.changed_at > since
    ).all()

    return {
        'tasks': [
            {
                'id': change.task_id,
                'operation': change.operation,
                'data': change.changes,
                'timestamp': change.changed_at.isoformat()
            }
            for change in changes if change.task_id
        ],
        'labels': [...]
    }
```

#### UI Indicators
```typescript
const OfflineIndicator = () => {
  const netInfo = useNetInfo();
  const syncQueue = useSyncQueue();

  return (
    <View style={styles.indicator}>
      {!netInfo.isConnected && (
        <View style={styles.offlineBadge}>
          <Icon name="wifi-off" />
          <Text>Offline</Text>
        </View>
      )}

      {syncQueue.length > 0 && (
        <View style={styles.syncBadge}>
          <Icon name="sync" />
          <Text>{syncQueue.length} pending</Text>
        </View>
      )}
    </View>
  );
};
```

### Conflict Resolution Strategies
1. **Last Write Wins** (default): Most recent change overwrites
2. **Server Wins**: Server version always preferred
3. **Client Wins**: Local version always preferred
4. **Manual Resolution**: Show conflict UI for user to choose

### Acceptance Criteria
- [ ] App works fully offline (view, create, edit, delete tasks)
- [ ] Changes saved to local database immediately
- [ ] Sync queue shows pending operations
- [ ] Auto-sync when network restored
- [ ] Manual sync button available
- [ ] Conflicts resolved automatically (LWW)
- [ ] Sync status visible to user
- [ ] No data loss during network failures
- [ ] Background sync works when app in background

### Estimated Effort
**High** - 8-10 days

---

## 12. Home Screen Widgets (iOS/Android)

**Labels:** `enhancement`, `mobile`, `ui`
**Priority:** Medium

### Overview
Add home screen widgets for quick access to tasks without opening the app.

### Problem Statement
Users must open the app to view their tasks. Quick glance at upcoming tasks from home screen would improve daily workflow.

### Proposed Solution
Native widgets for iOS 14+ and Android showing:
- Today's tasks
- Upcoming deadlines
- Quick add button
- Task counter

### Technical Implementation

#### iOS Widget (WidgetKit)
```swift
// ios/TasksWidget/TasksWidget.swift
import WidgetKit
import SwiftUI

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> TaskEntry {
        TaskEntry(date: Date(), tasks: [])
    }

    func getSnapshot(in context: Context, completion: @escaping (TaskEntry) -> ()) {
        let entry = TaskEntry(date: Date(), tasks: fetchTasks())
        completion(entry)
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> ()) {
        // Fetch tasks from shared UserDefaults (updated by main app)
        let tasks = fetchTasks()
        let entry = TaskEntry(date: Date(), tasks: tasks)

        // Refresh every 15 minutes
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: Date())!
        let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))

        completion(timeline)
    }
}

struct TaskEntry: TimelineEntry {
    let date: Date
    let tasks: [Task]
}

struct TasksWidgetEntryView : View {
    var entry: Provider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallWidgetView(tasks: entry.tasks)
        case .systemMedium:
            MediumWidgetView(tasks: entry.tasks)
        case .systemLarge:
            LargeWidgetView(tasks: entry.tasks)
        default:
            EmptyView()
        }
    }
}

struct SmallWidgetView: View {
    let tasks: [Task]

    var body: some View {
        VStack(alignment: .leading) {
            Text("Today")
                .font(.headline)

            if tasks.isEmpty {
                Text("No tasks today")
                    .font(.caption)
                    .foregroundColor(.gray)
            } else {
                ForEach(tasks.prefix(3)) { task in
                    HStack {
                        Image(systemName: task.completed ? "checkmark.circle.fill" : "circle")
                        Text(task.title)
                            .font(.caption)
                            .lineLimit(1)
                    }
                }
            }

            Spacer()

            Text("\(tasks.filter { !$0.completed }.count) pending")
                .font(.caption2)
                .foregroundColor(.gray)
        }
        .padding()
    }
}

@main
struct TasksWidget: Widget {
    let kind: String = "TasksWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: Provider()) { entry in
            TasksWidgetEntryView(entry: entry)
        }
        .configurationDisplayName("My Tasks")
        .description("Quick view of your tasks")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}
```

#### React Native Bridge
```typescript
// Share data with widget via SharedUserDefaults
import SharedGroupPreferences from 'react-native-shared-group-preferences';

const updateWidgetData = async (tasks: Task[]) => {
  try {
    const widgetData = {
      tasks: tasks.slice(0, 10).map(t => ({
        id: t.id,
        title: t.title,
        completed: t.completed,
        priority: t.priority,
        dueDate: t.due_date
      })),
      updatedAt: new Date().toISOString()
    };

    await SharedGroupPreferences.setItem(
      'widgetData',
      widgetData,
      'group.com.tasksai.widget'  // App Group ID
    );
  } catch (error) {
    console.error('Failed to update widget data:', error);
  }
};

// Call whenever tasks change
useEffect(() => {
  updateWidgetData(tasks);
}, [tasks]);
```

#### Android Widget
```kotlin
// android/app/src/main/java/com/tasksai/TasksWidget.kt
class TasksWidget : AppWidgetProvider() {
    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId)
        }
    }
}

internal fun updateAppWidget(
    context: Context,
    appWidgetManager: AppWidgetManager,
    appWidgetId: Int
) {
    // Read tasks from SharedPreferences
    val prefs = context.getSharedPreferences("widget_data", Context.MODE_PRIVATE)
    val tasksJson = prefs.getString("tasks", "[]")
    val tasks = Gson().fromJson(tasksJson, Array<Task>::class.java)

    // Build remote views
    val views = RemoteViews(context.packageName, R.layout.widget_tasks)

    // Set task list
    val intent = Intent(context, TasksWidgetService::class.java)
    views.setRemoteAdapter(R.id.task_list, intent)

    // Set header
    val pendingCount = tasks.count { !it.completed }
    views.setTextViewText(R.id.widget_title, "Today ($pendingCount)")

    // Click handler to open app
    val pendingIntent = PendingIntent.getActivity(
        context, 0,
        Intent(context, MainActivity::class.java),
        PendingIntent.FLAG_UPDATE_CURRENT
    )
    views.setOnClickPendingIntent(R.id.widget_container, pendingIntent)

    // Update widget
    appWidgetManager.updateAppWidget(appWidgetId, views)
}
```

### Widget Sizes
#### iOS
- **Small**: Task counter + top 3 tasks
- **Medium**: Today's tasks (up to 5) + quick add
- **Large**: Tasks grouped by priority

#### Android
- **1x1**: Task counter
- **2x2**: Top 3 tasks
- **4x2**: Today's full list

### Acceptance Criteria
- [ ] iOS widget shows today's tasks
- [ ] Android widget shows today's tasks
- [ ] Widget updates when tasks change
- [ ] Tapping widget opens app to task list
- [ ] Tapping task in widget opens that specific task
- [ ] Widget shows accurate task count
- [ ] Multiple widget sizes supported
- [ ] Widget handles empty state gracefully
- [ ] Widget respects system theme (light/dark)

### Estimated Effort
**Medium-High** - 5-6 days

---

## Summary

This document contains **12 detailed enhancement proposals** ready to be added as GitHub issues:

1. ✅ Real-Time Task Updates (WebSockets)
2. ✅ Collaborative Task Sharing
3. ✅ Advanced Filtering and Search
4. ✅ Full-Text Search (PostgreSQL)
5. ✅ Task Templates and Recurring Tasks
6. ✅ Mobile Push Notifications
7. ✅ Calendar Integration
8. ✅ Pagination for Task Listing
9. ✅ Smart Task Scheduling (AI)
10. ✅ Productivity Analytics Dashboard
11. ✅ Offline Mode with Sync
12. ✅ Home Screen Widgets

Each enhancement includes:
- Problem statement and motivation
- Detailed technical implementation
- Code examples and architecture
- Dependencies and libraries needed
- Security/privacy considerations
- Acceptance criteria
- Effort estimation

**Next Steps:**
1. Review each enhancement
2. Prioritize based on user needs and business goals
3. Create GitHub issues by copying sections from this document
4. Assign to team members or sprints
5. Begin implementation!
