from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["success"] == True
    assert response.json()["data"]["status"] == "ok"

def test_health_dependencies():
    response = client.get("/api/health/dependencies")
    assert response.status_code == 200
    # Will show connection status
