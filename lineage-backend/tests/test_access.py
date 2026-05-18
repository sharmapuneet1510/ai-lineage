import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_get_current_user():
    response = client.get("/api/auth/me", headers={"X-User": "puneet.sharma"})
    assert response.status_code == 200
    data = response.json()
    assert data["success"] == True
    # Will fail until seed data is loaded


def test_health():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["success"] == True
