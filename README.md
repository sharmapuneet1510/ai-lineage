# Data Lineage Platform

A view-only enterprise platform for regulatory data lineage, built with React, FastAPI, MSSQL, and Neo4j. This platform enables organizations to understand, visualize, and analyze data flow across complex systems for regulatory compliance and data governance.

## Quick Start

### Prerequisites

- Docker and Docker Compose
- Node.js 18+ (for frontend development)
- Python 3.9+ (for backend development)

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd ai-lineage

# Run the complete setup
bash scripts/setup-local.sh
```

For detailed setup instructions, see:
- [Frontend Setup](lineage-frontend/README.md)
- [Backend Setup](lineage-backend/README.md)

## Architecture

### Technology Stack

- **Frontend**: React 18 + TypeScript + Vite (port 5173)
  - Component-based UI with Tailwind CSS
  - React Query for server state management
  - React Router for navigation

- **Backend**: FastAPI + SQLAlchemy + Neo4j (port 8000)
  - RESTful API with comprehensive error handling
  - Async request handling with Python asyncio
  - Database abstraction layer

- **Databases**:
  - **MSSQL**: Operational data store (fields, jurisdictions, systems)
  - **Neo4j**: Graph database (lineage relationships, dependencies)

- **Infrastructure**: Docker Compose
  - Coordinated deployment of frontend, backend, MSSQL, and Neo4j
  - Local development environment

## Features

### Core Functionality

- **Field Search & Discovery**
  - Advanced search with filtering and pagination
  - Jurisdiction-based filtering
  - Real-time search with debouncing

- **Field 360 View**
  - Comprehensive field details with multiple tabs:
    - Overview: Basic field metadata
    - Business: Business interpretation and usage
    - Technical: Technical specifications and data types
    - XSLT: Related XSLT transformations
    - Java: Associated Java methods
    - Downstream: Downstream system impacts

- **Data Lineage Visualization**
  - XSLT and Java transformation drill-down
  - Field-to-system lineage mapping
  - Impact analysis for changes

- **Impact Analysis**
  - Field-level impact analysis
  - XSLT variable impact tracking
  - Java method dependency analysis
  - XPath expression evaluation

- **Field Comparison**
  - Compare field definitions across jurisdictions
  - Identify differences in data types, criticality, and formats
  - Multi-jurisdiction comparison

- **Graph Explorer**
  - Interactive Neo4j graph visualization
  - Node-based exploration
  - Relationship navigation

- **Global Search**
  - Cross-entity search across all data types
  - Filtering by entity type
  - Fast, indexed search results

- **Dashboard**
  - Key metrics visualization
  - Lineage coverage statistics
  - High-risk field identification
  - Jurisdiction-level insights

### Data Export

Supported export formats:
- CSV for spreadsheet applications
- Excel (XLSX) with formatting
- JSON for system integration
- PDF for documentation and reports

## API Documentation

### Backend API

The backend provides a comprehensive REST API with the following endpoint categories:

- **Fields** (`/api/fields`): Search, retrieve, and analyze field metadata
- **Impact Analysis** (`/api/impact-analysis`): Run impact analysis for changes
- **Comparisons** (`/api/fields/comparison`): Compare fields across jurisdictions
- **Graph** (`/api/graph`): Query and explore the lineage graph
- **Search** (`/api/search`): Global search across all entities
- **Dashboard** (`/api/dashboard`): Retrieve summary statistics

For detailed API documentation, see:
- [API Reference](docs/API.md)
- Live Swagger UI: `http://localhost:8000/docs` (when running locally)

## Development

### Project Structure

```
ai-lineage/
├── lineage-frontend/           # React frontend application
│   ├── src/
│   │   ├── components/         # Reusable components
│   │   ├── features/           # Feature modules (fields, impact, etc.)
│   │   ├── hooks/              # Custom React hooks
│   │   ├── __tests__/          # Test files
│   │   └── app/                # App configuration
│   └── README.md               # Frontend documentation
├── lineage-backend/            # FastAPI backend application
│   ├── app/
│   │   ├── api/                # API endpoints
│   │   ├── db/                 # Database connections
│   │   ├── models/             # Data models
│   │   ├── repositories/       # Data access layer
│   │   ├── core/               # Core utilities (errors, config)
│   │   └── main.py             # FastAPI app definition
│   ├── tests/                  # Test files
│   └── README.md               # Backend documentation
├── docs/                       # Documentation
│   ├── API.md                  # API reference
│   ├── DEVELOPMENT.md          # Development guide
│   └── ARCHITECTURE.md         # Architecture details
└── scripts/                    # Utility scripts
```

### Running the Application

#### Development

```bash
# Start all services (frontend, backend, databases)
docker-compose up -d

# Or run frontend and backend separately:

# Terminal 1: Frontend
cd lineage-frontend
npm install
npm run dev

# Terminal 2: Backend
cd lineage-backend
pip install -r requirements.txt
python -m uvicorn app.main:app --reload
```

#### Testing

```bash
# Backend tests
cd lineage-backend
pytest tests/ -v

# Frontend tests
cd lineage-frontend
npm run test
```

#### Building

```bash
# Frontend
cd lineage-frontend
npm run build

# Backend
cd lineage-backend
docker build -t ai-lineage-backend:latest .
```

## Troubleshooting

### Frontend Issues

- **Port 5173 already in use**: Change the port in vite.config.ts or kill existing process
- **API errors**: Check that backend is running on port 8000
- **Build errors**: Clear node_modules and reinstall: `rm -rf node_modules && npm install`

### Backend Issues

- **Database connection errors**: Verify MSSQL and Neo4j are running and credentials are correct
- **Port 8000 already in use**: Change the port in app/core/config.py or kill existing process
- **Import errors**: Ensure Python virtual environment is activated and dependencies installed

### Database Issues

- **MSSQL connection refused**: Check Docker container is running: `docker ps | grep mssql`
- **Neo4j authentication failed**: Verify Neo4j credentials match environment variables
- **Data not persisting**: Check Docker volumes are properly configured

## Configuration

### Environment Variables

#### Frontend (.env.local)
```
VITE_API_BASE_URL=http://localhost:8000
VITE_APP_ENV=development
```

#### Backend (.env)
```
MSSQL_CONNECTION_STRING=mssql+pyodbc://user:password@host:1433/dbname?driver=ODBC+Driver+17+for+SQL+Server
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=password
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
```

See individual README files for complete configuration options.

## Performance

### Optimization Features

- **Query Debouncing**: Search inputs are debounced by 500ms to reduce API calls
- **Response Caching**: React Query caches responses for 5 minutes with 10-minute persistence
- **Server-side Pagination**: Results are paginated server-side for efficient data loading
- **Lazy Loading**: Large datasets support infinite scroll and lazy loading
- **Database Indexing**: MSSQL and Neo4j use indexed queries for fast searches

### Performance Best Practices

- Use the Global Search for broad queries across all entities
- Leverage Field 360 for detailed analysis instead of multiple page loads
- Set appropriate pagination limits based on available memory
- Monitor API response times in browser DevTools

## Security

### Authentication & Authorization

The platform implements:
- Role-based access control (RBAC) for data access
- Field-level access restrictions based on jurisdiction
- Sensitive data masking in API responses
- Request validation and sanitization

### Data Protection

- HTTPS/TLS in production
- Secure database connections with credential management
- No sensitive data in logs or error messages
- GDPR-compliant data handling

## Compliance

This platform supports regulatory compliance for:
- Financial regulatory requirements (banking, insurance)
- Data governance frameworks
- Audit trails for data lineage changes
- Jurisdiction-specific data handling rules

## Contributing

See [DEVELOPMENT.md](docs/DEVELOPMENT.md) for contribution guidelines.

## Support

For issues and questions:
1. Check [troubleshooting](README.md#troubleshooting) section
2. Review [API documentation](docs/API.md)
3. Check existing issues in the repository
4. Contact the development team

## License

[License information to be added]

## Version

Version: 0.1.0

Last Updated: May 2026
