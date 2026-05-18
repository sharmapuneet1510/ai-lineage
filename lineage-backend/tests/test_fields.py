"""Tests for field endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestFieldSearch:
    """Tests for field search endpoints."""

    def test_search_fields_returns_200(self):
        """Test that field search returns 200 status code."""
        response = client.get("/api/fields")
        assert response.status_code == 200

    def test_search_fields_returns_valid_structure(self):
        """Test that field search returns valid response structure."""
        response = client.get("/api/fields")
        data = response.json()
        assert "data" in data
        assert isinstance(data["data"], dict)

    def test_search_fields_with_query(self):
        """Test field search with query parameter."""
        response = client.get("/api/fields?search=TRADE")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data

    def test_search_fields_with_pagination(self):
        """Test field search with pagination parameters."""
        response = client.get("/api/fields?page=1&pageSize=10")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data


class TestFieldDetail:
    """Tests for field detail endpoints."""

    def test_get_field_360_returns_200_or_404(self):
        """Test that field 360 returns either 200 or 404."""
        response = client.get("/api/fields/1")
        assert response.status_code in [200, 404]

    def test_get_field_not_found(self):
        """Test that non-existent field returns 404."""
        response = client.get("/api/fields/99999")
        assert response.status_code == 404

    def test_get_field_not_found_has_message(self):
        """Test that 404 response has error message."""
        response = client.get("/api/fields/99999")
        assert response.status_code == 404
        data = response.json()
        assert "message" in data or "data" in data


class TestFieldComparison:
    """Tests for field comparison endpoints."""

    def test_compare_fields_without_params_returns_400(self):
        """Test that comparison without required params returns 400."""
        response = client.get("/api/fields/comparison")
        assert response.status_code in [400, 422]

    def test_compare_fields_with_params(self):
        """Test field comparison with parameters."""
        response = client.get(
            "/api/fields/comparison?concept=TRADE_ID&jurisdictions=US,UK"
        )
        assert response.status_code in [200, 400]


class TestErrorHandling:
    """Tests for error handling."""

    def test_invalid_field_id_returns_error(self):
        """Test that invalid field ID returns error."""
        response = client.get("/api/fields/invalid")
        assert response.status_code in [400, 404, 422]

    def test_error_response_has_message(self):
        """Test that error responses contain a message."""
        response = client.get("/api/fields/invalid")
        data = response.json()
        assert "message" in data or "detail" in data
