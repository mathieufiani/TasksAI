"""
Migration script to add user_id column to tasks table
"""

from sqlalchemy import text
from app.db.session import engine

def migrate():
    """Add user_id column to tasks table"""
    with engine.connect() as connection:
        # Start a transaction
        trans = connection.begin()
        try:
            # Add user_id column to tasks table
            connection.execute(text("""
                ALTER TABLE tasks
                ADD COLUMN IF NOT EXISTS user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
            """))

            # Create index on user_id for better query performance
            connection.execute(text("""
                CREATE INDEX IF NOT EXISTS ix_tasks_user_id ON tasks(user_id)
            """))

            # Set user_id to 1 for existing tasks (assuming user with id=1 exists)
            # You may need to adjust this based on your user data
            connection.execute(text("""
                UPDATE tasks SET user_id = 1 WHERE user_id IS NULL
            """))

            # Make user_id NOT NULL after setting values
            connection.execute(text("""
                ALTER TABLE tasks ALTER COLUMN user_id SET NOT NULL
            """))

            trans.commit()
            print("✅ Migration completed successfully!")
            print("   - Added user_id column to tasks table")
            print("   - Created index on user_id")
            print("   - Set existing tasks to user_id=1")
            print("   - Made user_id NOT NULL")

        except Exception as e:
            trans.rollback()
            print(f"❌ Migration failed: {e}")
            raise

if __name__ == "__main__":
    migrate()
