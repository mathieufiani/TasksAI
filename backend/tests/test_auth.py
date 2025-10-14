"""
Integration tests for authentication endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models.task import Base
from app.db.session import get_db

# Mock external services before importing app
with patch('app.services.pinecone_service.Pinecone'):
    with patch('app.services.pinecone_service.AsyncOpenAI'):
        from app.main import app

# Create in-memory SQLite database for testing
SQLALCHEMY_DATABASE_URL = "sqlite:///./test.db"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create tables
Base.metadata.create_all(bind=engine)


def override_get_db():
    """Override database dependency for testing"""
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


@pytest.fixture(autouse=True)
def cleanup_database():
    """Clean up database before each test"""
    # Drop all tables and recreate
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    # Cleanup after test
    Base.metadata.drop_all(bind=engine)


@pytest.mark.integration
def test_user_registration_and_login_flow():
    """
    Integration test: Register a new user and login with credentials

    This test verifies the complete authentication flow:
    1. Register a new user with valid credentials
    2. Verify registration returns access and refresh tokens
    3. Login with the same credentials
    4. Verify login returns valid tokens
    """
    # Step 1: Register new user
    register_data = {
        "email": "testuser@example.com",
        "password": "securePassword123!",
        "full_name": "Test User"
    }

    register_response = client.post("/api/v1/auth/register", json=register_data)

    # Verify registration successful
    assert register_response.status_code == 201
    register_json = register_response.json()

    assert "access_token" in register_json
    assert "refresh_token" in register_json
    assert register_json["token_type"] == "bearer"
    assert "expires_in" in register_json

    # Step 2: Login with same credentials
    login_data = {
        "email": "testuser@example.com",
        "password": "securePassword123!"
    }

    login_response = client.post("/api/v1/auth/login", json=login_data)

    # Verify login successful
    assert login_response.status_code == 200
    login_json = login_response.json()

    assert "access_token" in login_json
    assert "refresh_token" in login_json
    assert login_json["token_type"] == "bearer"


@pytest.mark.integration
def test_duplicate_user_registration():
    """
    Integration test: Attempt to register duplicate user

    Verifies that attempting to register with an existing email
    returns appropriate error response
    """
    register_data = {
        "email": "duplicate@example.com",
        "password": "password123!",
        "full_name": "First User"
    }

    # First registration should succeed
    first_response = client.post("/api/v1/auth/register", json=register_data)
    assert first_response.status_code == 201

    # Second registration with same email should fail
    duplicate_data = {
        "email": "duplicate@example.com",
        "password": "differentPassword123!",
        "full_name": "Second User"
    }

    second_response = client.post("/api/v1/auth/register", json=duplicate_data)
    assert second_response.status_code == 400
    assert "already registered" in second_response.json()["detail"].lower()


@pytest.mark.integration
def test_login_with_wrong_password():
    """
    Integration test: Login with incorrect password

    Verifies that login fails appropriately with wrong credentials
    """
    # Register user
    register_data = {
        "email": "user@example.com",
        "password": "correctPassword123!",
        "full_name": "User"
    }
    register_response = client.post("/api/v1/auth/register", json=register_data)
    assert register_response.status_code == 201

    # Attempt login with wrong password
    login_data = {
        "email": "user@example.com",
        "password": "wrongPassword123!"
    }
    login_response = client.post("/api/v1/auth/login", json=login_data)

    assert login_response.status_code == 401
    assert "invalid" in login_response.json()["detail"].lower()


@pytest.mark.integration
def test_protected_endpoint_without_token():
    """
    Integration test: Access protected endpoint without authentication

    Verifies that protected endpoints require authentication
    """
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 403
    assert "not authenticated" in response.json()["detail"].lower()


@pytest.mark.integration
def test_protected_endpoint_with_valid_token():
    """
    Integration test: Access protected endpoint with valid token

    Verifies that authenticated users can access their profile
    """
    # Register and get token
    register_data = {
        "email": "authenticated@example.com",
        "password": "password123!",
        "full_name": "Authenticated User"
    }
    register_response = client.post("/api/v1/auth/register", json=register_data)
    assert register_response.status_code == 201

    token = register_response.json()["access_token"]

    # Access protected endpoint with token
    headers = {"Authorization": f"Bearer {token}"}
    profile_response = client.get("/api/v1/auth/me", headers=headers)

    assert profile_response.status_code == 200
    profile_data = profile_response.json()
    assert profile_data["email"] == "authenticated@example.com"
    assert profile_data["full_name"] == "Authenticated User"
