"""
Tests for the main application endpoints
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch

# Mock Pinecone before importing app
with patch('app.services.pinecone_service.Pinecone'):
    with patch('app.services.pinecone_service.AsyncOpenAI'):
        from app.main import app

client = TestClient(app)


@pytest.mark.unit
def test_read_root():
    """Test root endpoint"""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "app" in data
    assert "version" in data
    assert "Task Management API" in data["app"]  # Allow for test suffix


@pytest.mark.unit
def test_health_check():
    """Test health check endpoint"""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.unit
def test_api_docs_available():
    """Test that API documentation is available"""
    response = client.get("/docs")
    assert response.status_code == 200
