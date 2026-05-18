# Data Lineage Platform - API Reference

## Overview

The Data Lineage Platform provides a comprehensive REST API for accessing and analyzing data lineage information. All endpoints return JSON responses with a consistent structure.

## Base URL

```
http://localhost:8000/api
```

## Response Format

All API responses follow a standard format:

```json
{
  "success": true,
  "message": "Optional message",
  "data": {
    // Response data
  },
  "errors": []
}
```

### Error Response Format

```json
{
  "success": false,
  "message": "Error description",
  "data": null,
  "errors": []
}
```

## HTTP Status Codes

- `200`: Successful request
- `400`: Bad request (validation error)
- `403`: Access denied (authorization error)
- `404`: Resource not found
- `500`: Internal server error

## Authentication

Authentication headers (when required):
```
Authorization: Bearer <token>
```

## Endpoints

### Fields

#### Search Fields

Search for fields with optional filtering and pagination.

```
GET /fields
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| search | string | No | Search query (internal name or business name) |
| jurisdiction | string | No | Filter by jurisdiction code |
| criticality | string | No | Filter by criticality (HIGH, MEDIUM, LOW) |
| status | string | No | Filter by status (ACTIVE, INACTIVE) |
| page | integer | No | Page number (default: 1) |
| pageSize | integer | No | Results per page (default: 20) |

**Example Request:**

```bash
curl -X GET "http://localhost:8000/api/fields?search=TRADE&jurisdiction=US&page=1&pageSize=20"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "field_id": 1,
        "internal_field_name": "TRADE_ID",
        "business_name": "Trade Identifier",
        "jurisdiction_code": "US",
        "data_type": "VARCHAR(50)",
        "criticality": "HIGH",
        "status": "ACTIVE"
      }
    ],
    "total": 42,
    "page": 1,
    "pageSize": 20
  }
}
```

---

#### Get Field 360 View

Retrieve comprehensive field details including business/technical interpretations and relationships.

```
GET /fields/{field_id}
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| field_id | integer | Yes | Field identifier |

**Example Request:**

```bash
curl -X GET "http://localhost:8000/api/fields/1"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "field": {
      "field_id": 1,
      "internal_field_name": "TRADE_ID",
      "business_name": "Trade Identifier",
      "jurisdiction_code": "US",
      "data_type": "VARCHAR(50)",
      "criticality": "HIGH",
      "status": "ACTIVE"
    },
    "business_interpretation": "Unique identifier for each trade transaction...",
    "technical_interpretation": "Primary key field in TRADE table...",
    "xslt_variables": ["trade_id_var", "trans_id_var"],
    "java_methods": ["getTradeId()", "formatTradeId()"],
    "downstream_systems": ["Risk System", "Reporting Engine"]
  }
}
```

---

### Comparisons

#### Compare Fields Across Jurisdictions

Compare field definitions across multiple jurisdictions.

```
GET /fields/comparison
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| concept | string | Yes | Business concept to compare |
| jurisdictions | string | Yes | Comma-separated jurisdiction codes |

**Example Request:**

```bash
curl -X GET "http://localhost:8000/api/fields/comparison?concept=TRADE_ID&jurisdictions=US,UK,EU"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "attribute": "data_type",
        "US": "VARCHAR(50)",
        "UK": "VARCHAR(50)",
        "EU": "VARCHAR(100)"
      },
      {
        "attribute": "criticality",
        "US": "HIGH",
        "UK": "HIGH",
        "EU": "MEDIUM"
      }
    ]
  }
}
```

---

### Impact Analysis

#### Run Impact Analysis

Analyze the impact of changes to a specific source (field, variable, method, or XPath).

```
POST /impact-analysis/run
```

**Request Body:**

```json
{
  "source_type": "FIELD",
  "source_value": "TRADE_ID"
}
```

**Parameters:**

| Name | Type | Required | Values | Description |
|------|------|----------|--------|-------------|
| source_type | string | Yes | FIELD, XSLT_VARIABLE, JAVA_METHOD, XPATH | Type of source to analyze |
| source_value | string | Yes | - | Identifier for the source |

**Example Request:**

```bash
curl -X POST "http://localhost:8000/api/impact-analysis/run" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "FIELD",
    "source_value": "TRADE_ID"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "target_type": "XSLT_VARIABLE",
        "target_value": "trade_id_var",
        "severity": "HIGH",
        "status": "PENDING"
      },
      {
        "target_type": "JAVA_METHOD",
        "target_value": "processTradeId()",
        "severity": "MEDIUM",
        "status": "ANALYZED"
      }
    ]
  }
}
```

---

### Graph

#### Search Graph

Search for nodes in the Neo4j graph database.

```
POST /graph/search
```

**Request Body:**

```json
{
  "query": "TRADE_ID",
  "type": "Field"
}
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| query | string | Yes | Search query |
| type | string | No | Filter by node type (Field, XsltVariable, JavaMethod, etc.) |

**Example Request:**

```bash
curl -X POST "http://localhost:8000/api/graph/search" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "TRADE_ID",
    "type": "Field"
  }'
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "nodes": [
      {
        "id": "field_1",
        "name": "TRADE_ID",
        "type": "Field",
        "description": "Trade Identifier",
        "properties": {
          "criticality": "HIGH",
          "jurisdiction": "US"
        }
      }
    ]
  }
}
```

---

### Search

#### Global Search

Perform a global search across all entities.

```
GET /search/global
```

**Parameters:**

| Name | Type | Required | Description |
|------|------|----------|-------------|
| q | string | Yes | Search query |
| limit | integer | No | Maximum results to return (default: 50) |

**Example Request:**

```bash
curl -X GET "http://localhost:8000/api/search/global?q=TRADE&limit=50"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "field_1",
        "name": "TRADE_ID",
        "type": "Field",
        "location": "TRADE_MASTER / TRADE_ID",
        "description": "Unique trade identifier"
      },
      {
        "id": "xslt_var_1",
        "name": "trade_id_var",
        "type": "XsltVariable",
        "location": "transform_trade.xslt",
        "description": "XSLT variable for trade ID"
      }
    ]
  }
}
```

---

### Dashboard

#### Get Dashboard Summary

Retrieve key metrics and statistics for the dashboard.

```
GET /dashboard/summary
```

**Example Request:**

```bash
curl -X GET "http://localhost:8000/api/dashboard/summary"
```

**Example Response:**

```json
{
  "success": true,
  "data": {
    "total_jurisdictions": 5,
    "total_fields": 342,
    "fields_with_lineage": 289,
    "high_risk_fields": 12,
    "coverage_percentage": 84.5
  }
}
```

---

## Error Codes

### Common Error Responses

#### 400 - Bad Request

```json
{
  "success": false,
  "message": "Invalid search parameters",
  "errors": ["page must be positive"]
}
```

#### 403 - Access Denied

```json
{
  "success": false,
  "message": "You don't have permission to view this content",
  "errors": []
}
```

#### 404 - Not Found

```json
{
  "success": false,
  "message": "Field not found: 99999",
  "errors": []
}
```

#### 500 - Internal Server Error

```json
{
  "success": false,
  "message": "Internal server error",
  "errors": []
}
```

---

## Rate Limiting

The API implements rate limiting to ensure stability:

- **Default Limit**: 100 requests per minute per IP
- **Header**: `X-RateLimit-Remaining` shows remaining requests

---

## Pagination

List endpoints support cursor-based pagination:

**Parameters:**

| Name | Type | Description |
|------|------|-------------|
| page | integer | Page number (1-indexed) |
| pageSize | integer | Results per page (1-100, default 20) |

**Example:**

```bash
curl -X GET "http://localhost:8000/api/fields?page=2&pageSize=50"
```

---

## Filtering

Search endpoints support the following filters:

### Field Filters

```
GET /fields?jurisdiction=US&criticality=HIGH&status=ACTIVE
```

**Available Filters:**

- `jurisdiction`: Jurisdiction code (e.g., US, UK, EU)
- `criticality`: HIGH, MEDIUM, LOW
- `status`: ACTIVE, INACTIVE, DEPRECATED
- `search`: Full-text search on name and description

---

## Examples

### Example 1: Find High-Risk Fields

```bash
curl -X GET "http://localhost:8000/api/fields?criticality=HIGH&status=ACTIVE"
```

### Example 2: Analyze Field Impact

```bash
curl -X POST "http://localhost:8000/api/impact-analysis/run" \
  -H "Content-Type: application/json" \
  -d '{
    "source_type": "FIELD",
    "source_value": "ACCOUNT_NUMBER"
  }'
```

### Example 3: Compare Fields Across Regions

```bash
curl -X GET "http://localhost:8000/api/fields/comparison?concept=CUSTOMER_ID&jurisdictions=US,UK,APAC"
```

### Example 4: Global Search

```bash
curl -X GET "http://localhost:8000/api/search/global?q=payment%20method"
```

---

## Swagger UI

Interactive API documentation is available at:

```
http://localhost:8000/docs
```

This provides:
- Endpoint descriptions
- Request/response schemas
- Try-it-out functionality
- Response examples

---

## Webhooks

Webhooks are not currently supported but may be added in future versions for real-time notifications on lineage changes.

---

## Versioning

Current API Version: **v1**

The API uses URL-based versioning. Future versions will be accessible at `/api/v2`, etc.

---

## Support

For API issues or questions:
1. Check the [Swagger UI](http://localhost:8000/docs)
2. Review error messages and codes above
3. Check application logs for detailed error information
4. Contact support with endpoint and request details

Last Updated: May 2026
