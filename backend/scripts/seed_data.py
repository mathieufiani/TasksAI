"""
Seed script to populate the database with sample data for development and testing.

Usage:
    cd backend
    python -m scripts.seed_data

This will create:
- 2 demo users with login credentials
- 15-20 sample tasks across different categories
- Sample labels for demonstration
"""

import sys
import os
from datetime import datetime, timedelta

# Add parent directory to path for imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import SessionLocal
from app.db.init_db import init_db
from app.models.user import User
from app.models.task import Task, TaskLabel, TaskStatus, TaskPriority, LabelingStatus, LabelCategory
from app.core.security import get_password_hash


def clear_data(db):
    """Clear all existing data from the database"""
    print("Clearing existing data...")
    db.query(TaskLabel).delete()
    db.query(Task).delete()
    db.query(User).delete()
    db.commit()
    print("✓ Existing data cleared")


def create_demo_users(db):
    """Create demo users for testing"""
    print("\nCreating demo users...")

    users_data = [
        {
            "email": "demo@tasksai.com",
            "password": "demo123!",
            "full_name": "Demo User",
            "is_verified": True,
        },
        {
            "email": "john.doe@example.com",
            "password": "password123!",
            "full_name": "John Doe",
            "is_verified": True,
        }
    ]

    users = []
    for user_data in users_data:
        # Check if user already exists
        existing_user = db.query(User).filter(User.email == user_data["email"]).first()
        if existing_user:
            print(f"  - User '{user_data['email']}' already exists, skipping...")
            users.append(existing_user)
            continue

        # Create new user
        user = User(
            email=user_data["email"],
            hashed_password=get_password_hash(user_data["password"]),
            full_name=user_data["full_name"],
            is_verified=user_data["is_verified"],
            is_active=True,
            created_at=datetime.utcnow()
        )
        db.add(user)
        db.flush()  # Get the ID without committing
        users.append(user)
        print(f"  ✓ Created user: {user.email} (password: {user_data['password']})")

    db.commit()
    print(f"✓ {len(users)} users created/verified")
    return users


def create_sample_tasks(db, user):
    """Create diverse sample tasks for a user"""
    print(f"\nCreating sample tasks for {user.email}...")

    # Sample tasks with diverse content across multiple categories
    tasks_data = [
        # Work tasks
        {
            "title": "Finish project documentation",
            "description": "Complete the README, API docs, and architecture diagram for the TasksAI project before the deadline.",
            "priority": TaskPriority.HIGH,
            "status": TaskStatus.IN_PROGRESS,
            "due_date": datetime.utcnow() + timedelta(days=2),
        },
        {
            "title": "Review pull requests",
            "description": "Review and approve 3 pending pull requests from the team. Focus on code quality and test coverage.",
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(days=1),
        },
        {
            "title": "Deploy backend to staging",
            "description": "Deploy the latest backend changes to GCP App Engine staging environment and verify all endpoints work correctly.",
            "priority": TaskPriority.URGENT,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(hours=6),
        },
        {
            "title": "Refactor authentication module",
            "description": "Clean up the authentication code, improve error handling, and add better logging for debugging.",
            "priority": TaskPriority.LOW,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(days=7),
        },

        # Learning tasks
        {
            "title": "Learn React Native animations",
            "description": "Watch tutorial series on React Native Animated API and practice building smooth transitions for the mobile app.",
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(days=5),
        },
        {
            "title": "Read about vector databases",
            "description": "Study how Pinecone and other vector databases work under the hood. Understand indexing and similarity search algorithms.",
            "priority": TaskPriority.LOW,
            "status": TaskStatus.TODO,
            "due_date": None,
        },
        {
            "title": "Complete FastAPI course",
            "description": "Finish the remaining 3 modules of the FastAPI masterclass on advanced features like WebSockets and background tasks.",
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.IN_PROGRESS,
            "due_date": datetime.utcnow() + timedelta(days=10),
        },

        # Personal tasks
        {
            "title": "Buy groceries",
            "description": "Get milk, eggs, bread, chicken, vegetables, and fruits from Whole Foods. Don't forget the organic blueberries!",
            "priority": TaskPriority.HIGH,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(days=1),
        },
        {
            "title": "Schedule dentist appointment",
            "description": "Call Dr. Smith's office to schedule a teeth cleaning. Prefer morning slots if available.",
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(days=3),
        },
        {
            "title": "Organize home office",
            "description": "Clean desk, organize cables, file papers, and set up better lighting for video calls.",
            "priority": TaskPriority.LOW,
            "status": TaskStatus.TODO,
            "due_date": None,
        },

        # Health & Fitness
        {
            "title": "Go for a morning run",
            "description": "Run 5K in Central Park. Try to beat last week's time of 28 minutes.",
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.COMPLETED,
            "due_date": datetime.utcnow() - timedelta(days=1),
            "completed_at": datetime.utcnow() - timedelta(hours=12),
        },
        {
            "title": "Meal prep for the week",
            "description": "Prepare chicken, rice, vegetables, and salads for lunch. Cook in batches for Monday through Friday.",
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(days=2),
        },

        # Finance
        {
            "title": "Submit tax documents",
            "description": "Send W2, 1099 forms, and receipts to the accountant. Deadline is approaching!",
            "priority": TaskPriority.URGENT,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(days=4),
        },
        {
            "title": "Review investment portfolio",
            "description": "Check stock performance, rebalance portfolio if needed, and consider increasing 401k contribution.",
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(days=7),
        },

        # Social
        {
            "title": "Plan birthday party for Sarah",
            "description": "Book restaurant for 20 people, order cake, send invitations, and coordinate with other friends.",
            "priority": TaskPriority.HIGH,
            "status": TaskStatus.IN_PROGRESS,
            "due_date": datetime.utcnow() + timedelta(days=12),
        },
        {
            "title": "Call Mom",
            "description": "Weekly check-in call with Mom. Ask about her trip to Florida and how Dad is doing.",
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(days=1),
        },

        # Creative
        {
            "title": "Write blog post about AI",
            "description": "Draft article about building AI-powered task management systems. Include code examples and architecture diagrams.",
            "priority": TaskPriority.LOW,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(days=14),
        },
        {
            "title": "Edit vacation photos",
            "description": "Go through 200+ photos from Japan trip. Select best ones and edit in Lightroom.",
            "priority": TaskPriority.LOW,
            "status": TaskStatus.TODO,
            "due_date": None,
        },

        # Maintenance
        {
            "title": "Car oil change",
            "description": "Take car to mechanic for regular oil change and tire rotation. Check brake pads too.",
            "priority": TaskPriority.MEDIUM,
            "status": TaskStatus.TODO,
            "due_date": datetime.utcnow() + timedelta(days=5),
        },
        {
            "title": "Update laptop software",
            "description": "Install macOS updates, update npm packages, and upgrade Python dependencies across projects.",
            "priority": TaskPriority.LOW,
            "status": TaskStatus.COMPLETED,
            "due_date": datetime.utcnow() - timedelta(days=2),
            "completed_at": datetime.utcnow() - timedelta(days=2),
        },
    ]

    tasks = []
    for task_data in tasks_data:
        task = Task(
            user_id=user.id,
            title=task_data["title"],
            description=task_data["description"],
            priority=task_data["priority"],
            status=task_data["status"],
            due_date=task_data.get("due_date"),
            completed_at=task_data.get("completed_at"),
            labeling_status=LabelingStatus.PENDING,  # Will be populated by AI later
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db.add(task)
        db.flush()  # Get the ID
        tasks.append(task)
        print(f"  ✓ Created task: {task.title}")

    db.commit()
    print(f"✓ {len(tasks)} tasks created")
    return tasks


def create_sample_labels(db, tasks):
    """Create sample labels for some tasks to demonstrate the feature"""
    print("\nCreating sample labels...")

    # Labels for specific tasks (for demonstration - normally generated by AI)
    labels_data = [
        # "Finish project documentation" - Work task
        {
            "task_index": 0,
            "labels": [
                {
                    "label_name": "Documentation",
                    "label_category": LabelCategory.CATEGORY,
                    "confidence_score": 0.95,
                    "reasoning": "Task explicitly involves writing documentation",
                    "is_primary": True,
                },
                {
                    "label_name": "Work",
                    "label_category": LabelCategory.CATEGORY,
                    "confidence_score": 0.92,
                    "reasoning": "Professional project-related task",
                    "is_primary": True,
                },
            ]
        },
        # "Buy groceries" - Personal task
        {
            "task_index": 7,
            "labels": [
                {
                    "label_name": "Shopping",
                    "label_category": LabelCategory.CATEGORY,
                    "confidence_score": 0.98,
                    "reasoning": "Task involves purchasing items",
                    "is_primary": True,
                },
                {
                    "label_name": "Personal",
                    "label_category": LabelCategory.CATEGORY,
                    "confidence_score": 0.90,
                    "reasoning": "Personal household shopping",
                    "is_primary": True,
                },
                {
                    "label_name": "Quick",
                    "label_category": LabelCategory.DURATION,
                    "confidence_score": 0.75,
                    "reasoning": "Grocery shopping typically takes 30-60 minutes",
                    "is_primary": False,
                },
            ]
        },
        # "Learn React Native animations" - Learning task
        {
            "task_index": 4,
            "labels": [
                {
                    "label_name": "Learning",
                    "label_category": LabelCategory.CATEGORY,
                    "confidence_score": 0.96,
                    "reasoning": "Task focused on learning new skills",
                    "is_primary": True,
                },
                {
                    "label_name": "Technology",
                    "label_category": LabelCategory.CATEGORY,
                    "confidence_score": 0.94,
                    "reasoning": "Learning about React Native framework",
                    "is_primary": True,
                },
                {
                    "label_name": "Computer",
                    "label_category": LabelCategory.TOOLS,
                    "confidence_score": 0.88,
                    "reasoning": "Requires computer for tutorials and practice",
                    "is_primary": False,
                },
            ]
        },
        # "Submit tax documents" - Finance task
        {
            "task_index": 12,
            "labels": [
                {
                    "label_name": "Finance",
                    "label_category": LabelCategory.CATEGORY,
                    "confidence_score": 0.97,
                    "reasoning": "Task related to financial and tax matters",
                    "is_primary": True,
                },
                {
                    "label_name": "Administrative",
                    "label_category": LabelCategory.CATEGORY,
                    "confidence_score": 0.89,
                    "reasoning": "Administrative paperwork task",
                    "is_primary": True,
                },
                {
                    "label_name": "Urgent",
                    "label_category": LabelCategory.TIME,
                    "confidence_score": 0.85,
                    "reasoning": "Deadline-sensitive task",
                    "is_primary": False,
                },
            ]
        },
        # "Go for a morning run" - Health task (completed)
        {
            "task_index": 10,
            "labels": [
                {
                    "label_name": "Exercise",
                    "label_category": LabelCategory.CATEGORY,
                    "confidence_score": 0.99,
                    "reasoning": "Physical fitness activity",
                    "is_primary": True,
                },
                {
                    "label_name": "Health",
                    "label_category": LabelCategory.CATEGORY,
                    "confidence_score": 0.95,
                    "reasoning": "Health and wellness related",
                    "is_primary": True,
                },
                {
                    "label_name": "Outdoor",
                    "label_category": LabelCategory.LOCATION,
                    "confidence_score": 0.92,
                    "reasoning": "Running in Central Park",
                    "is_primary": False,
                },
                {
                    "label_name": "High Energy",
                    "label_category": LabelCategory.ENERGY,
                    "confidence_score": 0.87,
                    "reasoning": "Running requires significant physical energy",
                    "is_primary": False,
                },
            ]
        },
    ]

    label_count = 0
    for label_group in labels_data:
        task = tasks[label_group["task_index"]]
        for label_data in label_group["labels"]:
            label = TaskLabel(
                task_id=task.id,
                label_name=label_data["label_name"],
                label_category=label_data["label_category"],
                confidence_score=label_data["confidence_score"],
                reasoning=label_data.get("reasoning"),
                is_primary=label_data.get("is_primary", False),
                created_at=datetime.utcnow(),
            )
            db.add(label)
            label_count += 1

        # Update task labeling status
        task.labeling_status = LabelingStatus.COMPLETED
        task.labeling_completed_at = datetime.utcnow()

    db.commit()
    print(f"✓ {label_count} sample labels created for {len(labels_data)} tasks")


def main():
    """Main seed function"""
    print("=" * 60)
    print("TasksAI Database Seeding Script")
    print("=" * 60)

    # Initialize database
    print("\nInitializing database...")
    init_db()

    # Create database session
    db = SessionLocal()

    try:
        # Clear existing data
        clear_data(db)

        # Create demo users
        users = create_demo_users(db)

        # Create sample tasks for the first user (demo@tasksai.com)
        tasks = create_sample_tasks(db, users[0])

        # Create sample labels for demonstration
        create_sample_labels(db, tasks)

        # Print summary
        print("\n" + "=" * 60)
        print("SEEDING COMPLETE!")
        print("=" * 60)
        print(f"\n✓ Created {len(users)} demo users")
        print(f"✓ Created {len(tasks)} sample tasks")
        print(f"✓ Created sample labels for demonstration")

        print("\n📋 Test Credentials:")
        print("  Email:    demo@tasksai.com")
        print("  Password: demo123!")
        print("\n  Email:    john.doe@example.com")
        print("  Password: password123!")

        print("\n💡 Next Steps:")
        print("  1. Start the backend: uvicorn app.main:app --reload")
        print("  2. Login with demo credentials")
        print("  3. Explore the sample tasks and labels")
        print("  4. Test AI labeling on new tasks")
        print("\n" + "=" * 60)

    except Exception as e:
        print(f"\n❌ Error during seeding: {str(e)}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
