from app.models.task import Base
from app.db.session import engine


def init_db():
    """
    Initialize database by creating all tables.
    This should be run once when setting up the application.
    """
    Base.metadata.create_all(bind=engine)
    print("Database tables created successfully!")


if __name__ == "__main__":
    init_db()
