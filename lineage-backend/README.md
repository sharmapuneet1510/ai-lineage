# Data Lineage Platform - Backend

FastAPI backend for the Data Lineage Platform, providing REST APIs for data lineage analysis, field management, impact analysis, and more.

## Quick Start

### Prerequisites

- Python 3.9+
- pip or conda
- MSSQL Server (Docker container recommended)
- Neo4j (Docker container recommended)

### Setup

1. **Create Virtual Environment**

```bash
python -m venv venv

# Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. **Install Dependencies**

```bash
pip install -r requirements.txt
pip install -r requirements-dev.txt  # For development
```

3. **Configure Environment**

```bash
cp .env.example .env

# Edit .env with your settings
# MSSQL_CONNECTION_STRING=
# NEO4J_URI=bolt://localhost:7687
# NEO4J_USER=neo4j
# NEO4J_PASSWORD=<password>
```

4. **Start Databases** (if using Docker)

```bash
docker-compose up -d
```

5. **Initialize Databases**

```bash
python scripts/insert_mssql_seed.py
python scripts/insert_neo4j_seed.py
```

## Running the Application

### Development Mode

```bash
python -m uvicorn app.main:app --reload --port 8000
```

The application will be available at:
- **API**: `http://localhost:8000/api`
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Production Mode

```bash
uvicorn app.main:app --port 8000 --workers 4
```

## Project Structure

```
lineage-backend/
├── app/
│   ├── api/
│   │   ├── router.py              # Main API router
│   │   └── endpoints/             # Endpoint implementations
│   │       ├── fields.py
│   │       ├── impact.py
│   │       ├── comparison.py
│   │       ├── graph.py
│   │       ├── search.py
│   │       └── dashboard.py
│   ├── core/
│   │   ├── config.py              # Configuration management
│   │   ├── exceptions.py          # Custom exception classes
│   │   ├── error_handlers.py      # Global error handling
│   │   └── response.py            # Response models
│   ├── db/
│   │   ├── mssql.py               # MSSQL connection
│   │   ├── neo4j.py               # Neo4j connection
│   │   └── __init__.py
│   ├── models/
│   │   ├── field_models.py        # Field data models
│   │   ├── access_models.py       # Access control models
│   │   └── __init__.py
│   ├── repositories/
│   │   ├── field_repository.py    # Field data access layer
│   │   ├── access_repository.py   # Access control data layer
│   │   └── __init__.py
│   ├── utils/
│   │   └── __init__.py
│   ├── __init__.py
│   └── main.py                    # FastAPI app entry point
├── tests/
│   ├── test_fields.py             # Field endpoint tests
│   ├── test_impact.py             # Impact analysis tests
│   ├── test_access.py             # Access control tests
│   ├── test_health.py             # Health check tests
│   ├── conftest.py                # Test configuration
│   └── __init__.py
├── scripts/
│   ├── insert_mssql_seed.py       # MSSQL database initialization
│   ├── insert_neo4j_seed.py       # Neo4j graph initialization
│   ├── validate_connections.py    # Connection validation
│   └── insert_sample_data.py      # Sample data insertion
├── .env.example                   # Environment variables template
├── requirements.txt               # Production dependencies
├── requirements-dev.txt           # Development dependencies
├── pytest.ini                     # Pytest configuration
└── README.md                      # This file
```

## Configuration

### Environment Variables

Create `.env` file with the following variables:

```env
# Application
APP_NAME=Lineage Platform API
DEBUG=false

# MSSQL Configuration
MSSQL_SERVER=localhost
MSSQL_PORT=1433
MSSQL_DATABASE=lineage_db
MSSQL_USER=sa
MSSQL_PASSWORD=YourPassword123!
MSSQL_CONNECTION_STRING=mssql+pyodbc://sa:YourPassword123!@localhost:1433/lineage_db?driver=ODBC+Driver+17+for+SQL+Server

# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password

# CORS Configuration
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000,http://localhost:8080

# API Configuration
API_TITLE=Data Lineage Platform API
API_VERSION=0.1.0
```

## API Endpoints

### Fields
- `GET /api/fields` - Search fields
- `GET /api/fields/{field_id}` - Get field 360 view
- `GET /api/fields/comparison` - Compare fields across jurisdictions

### Impact Analysis
- `POST /api/impact-analysis/run` - Run impact analysis

### Graph
- `POST /api/graph/search` - Search graph nodes

### Search
- `GET /api/search/global` - Global search

### Dashboard
- `GET /api/dashboard/summary` - Get dashboard metrics

For detailed API documentation, see [API.md](../docs/API.md) or visit the Swagger UI at `http://localhost:8000/docs`

## Testing

### Run All Tests

```bash
pytest tests/ -v
```

### Run Specific Test File

```bash
pytest tests/test_fields.py -v
```

### Run Specific Test

```bash
pytest tests/test_fields.py::TestFieldSearch::test_search_fields_returns_200 -v
```

### Run with Coverage

```bash
pytest tests/ --cov=app --cov-report=html
```

Coverage report will be generated in `htmlcov/index.html`

### Run in Watch Mode

```bash
pytest-watch tests/
```

## Development

### Code Formatting

```bash
# Format code with Black
black app tests

# Sort imports with isort
isort app tests

# Lint code with Flake8
flake8 app tests
```

### Pre-commit Hooks

```bash
pre-commit install
```

### Database Migrations

Database schema changes should be managed through SQL scripts:

```bash
# Apply migrations
python scripts/apply_migrations.py

# Rollback migrations
python scripts/rollback_migrations.py
```

## Architecture

### Request-Response Flow

1. **Request** → FastAPI Route Handler
2. **Validation** → Pydantic Models
3. **Business Logic** → Repository Layer
4. **Data Access** → MSSQL/Neo4j
5. **Response** → Standardized JSON Response

### Error Handling

All errors are handled by global exception handlers in `app/core/error_handlers.py`:

- `LineageException` (400): General application errors
- `ValidationException` (400): Input validation errors
- `AccessDeniedException` (403): Authorization errors
- `NotFoundException` (404): Resource not found
- `Exception` (500): Unhandled errors

### Database Connections

**MSSQL**: SQLAlchemy with pyodbc driver
- Connection pooling
- Async support
- Automatic connection management

**Neo4j**: Neo4j Python Driver
- Connection management
- Transaction handling
- Query optimization

## Performance Optimization

- Query result caching (5 minutes default)
- Database indexing on frequently searched columns
- Connection pooling for both MSSQL and Neo4j
- Pagination for large result sets
- Async request handling

## Security

- Input validation on all endpoints
- SQL injection prevention via parameterized queries
- CORS configuration for frontend access
- Error messages don't expose sensitive information
- Environment-based secrets management

## Troubleshooting

### Connection Issues

```bash
# Validate database connections
python scripts/validate_connections.py
```

### Port Already in Use

```bash
# Find and kill process on port 8000
lsof -i :8000
kill -9 <PID>
```

### Module Import Errors

```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### Database Access Issues

1. Check database credentials in `.env`
2. Verify database containers are running: `docker-compose ps`
3. Check database logs: `docker-compose logs mssql neo4j`
4. Validate connection: `python scripts/validate_connections.py`

## Deployment

### Docker

```bash
# Build Docker image
docker build -t lineage-backend:latest .

# Run Docker container
docker run -p 8000:8000 --env-file .env lineage-backend:latest
```

### Docker Compose

```bash
docker-compose up -d backend
```

### Production Checklist

- [ ] Set `DEBUG=false` in environment
- [ ] Configure proper CORS origins
- [ ] Use environment-specific secrets
- [ ] Enable HTTPS/TLS
- [ ] Set up monitoring and logging
- [ ] Configure database backups
- [ ] Run security audit
- [ ] Load test the application

## Monitoring and Logging

The application logs to console by default. Customize logging in `app/core/config.py`:

```python
import logging

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
```

## Contributing

See [DEVELOPMENT.md](../docs/DEVELOPMENT.md) for contribution guidelines.

## Support

For issues and questions:
1. Check the troubleshooting section above
2. Review API documentation at `http://localhost:8000/docs`
3. Check application logs for error details
4. Review test files for usage examples

## License

[License information to be added]

## Version

Version: 0.1.0

Last Updated: May 2026
