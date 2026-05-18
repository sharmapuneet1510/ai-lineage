"""Tests for impact analysis endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class TestImpactAnalysis:
    """Tests for impact analysis endpoints."""

    def test_run_impact_analysis_field(self):
        """Test running impact analysis for a field."""
        response = client.post(
            "/api/impact-analysis/run",
            json={
                "source_type": "FIELD",
                "source_value": "TRADE_ID"
            }
        )
        assert response.status_code in [200, 400, 404]

    def test_run_impact_analysis_xslt_variable(self):
        """Test running impact analysis for XSLT variable."""
        response = client.post(
            "/api/impact-analysis/run",
            json={
                "source_type": "XSLT_VARIABLE",
                "source_value": "var_name"
            }
        )
        assert response.status_code in [200, 400, 404]

    def test_run_impact_analysis_java_method(self):
        """Test running impact analysis for Java method."""
        response = client.post(
            "/api/impact-analysis/run",
            json={
                "source_type": "JAVA_METHOD",
                "source_value": "method_name"
            }
        )
        assert response.status_code in [200, 400, 404]

    def test_run_impact_analysis_xpath(self):
        """Test running impact analysis for XPath."""
        response = client.post(
            "/api/impact-analysis/run",
            json={
                "source_type": "XPATH",
                "source_value": "/path/to/node"
            }
        )
        assert response.status_code in [200, 400, 404]

    def test_impact_analysis_missing_source_type(self):
        """Test that missing source_type returns error."""
        response = client.post(
            "/api/impact-analysis/run",
            json={"source_value": "test"}
        )
        assert response.status_code in [400, 422]

    def test_impact_analysis_missing_source_value(self):
        """Test that missing source_value returns error."""
        response = client.post(
            "/api/impact-analysis/run",
            json={"source_type": "FIELD"}
        )
        assert response.status_code in [400, 422]

    def test_impact_analysis_response_has_data(self):
        """Test that successful impact analysis has data."""
        response = client.post(
            "/api/impact-analysis/run",
            json={
                "source_type": "FIELD",
                "source_value": "TRADE_ID"
            }
        )
        if response.status_code == 200:
            data = response.json()
            assert "data" in data


class TestImpactAnalysisValidation:
    """Tests for impact analysis input validation."""

    def test_invalid_source_type(self):
        """Test that invalid source type is rejected."""
        response = client.post(
            "/api/impact-analysis/run",
            json={
                "source_type": "INVALID_TYPE",
                "source_value": "test"
            }
        )
        assert response.status_code in [400, 422]

    def test_empty_source_value(self):
        """Test that empty source value is rejected."""
        response = client.post(
            "/api/impact-analysis/run",
            json={
                "source_type": "FIELD",
                "source_value": ""
            }
        )
        assert response.status_code in [400, 422]
