# Development Guide

This guide provides comprehensive information for developers working on the Data Lineage Platform.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Development Workflow](#development-workflow)
4. [Frontend Development](#frontend-development)
5. [Backend Development](#backend-development)
6. [Testing](#testing)
7. [Code Standards](#code-standards)
8. [Debugging](#debugging)
9. [Common Tasks](#common-tasks)
10. [Troubleshooting](#troubleshooting)

## Development Environment Setup

### Prerequisites

- **Node.js**: v18.0.0 or higher
- **Python**: 3.9 or higher
- **Git**: 2.25 or higher
- **Docker**: 20.10 or higher
- **Docker Compose**: 1.29 or higher

### Initial Setup

1. **Clone the Repository**

```bash
git clone <repository-url>
cd ai-lineage
```

2. **Install Dependencies**

```bash
# Backend dependencies
cd lineage-backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
pip install -r requirements-dev.txt

# Frontend dependencies
cd ../lineage-frontend
npm install
```

3. **Set Up Environment Variables**

```bash
# Backend (.env)
cp lineage-backend/.env.example lineage-backend/.env

# Frontend (.env.local)
cp lineage-frontend/.env.example lineage-frontend/.env.local
```

4. **Start Docker Services**

```bash
docker-compose up -d
```

5. **Initialize Databases**

```bash
# Run database scripts
cd lineage-backend
python scripts/insert_mssql_seed.py
python scripts/insert_neo4j_seed.py
```

## Project Structure

```
ai-lineage/
├── lineage-backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── router.py              # Main router
│   │   │   ├── endpoints/             # Endpoint implementations
│   │   │   │   ├── fields.py
│   │   │   │   ├── impact.py
│   │   │   │   ├── comparison.py
│   │   │   │   ├── graph.py
│   │   │   │   ├── search.py
│   │   │   │   └── dashboard.py
│   │   ├── core/
│   │   │   ├── config.py              # Configuration
│   │   │   ├── exceptions.py          # Custom exceptions
│   │   │   ├── error_handlers.py      # Error handling
│   │   │   └── response.py            # Response models
│   │   ├── db/
│   │   │   ├── mssql.py               # MSSQL connection
│   │   │   └── neo4j.py               # Neo4j connection
│   │   ├── models/
│   │   │   ├── field_models.py        # Field data models
│   │   │   ├── access_models.py       # Access control models
│   │   ├── repositories/
│   │   │   ├── field_repository.py    # Field data access
│   │   │   └── access_repository.py   # Access control data access
│   │   └── main.py                    # FastAPI app entry point
│   ├── tests/
│   │   ├── test_fields.py
│   │   ├── test_impact.py
│   │   ├── test_health.py
│   │   └── conftest.py                # Test configuration
│   ├── scripts/
│   │   ├── insert_mssql_seed.py       # MSSQL seeding
│   │   └── insert_neo4j_seed.py       # Neo4j seeding
│   ├── requirements.txt               # Production dependencies
│   ├── requirements-dev.txt           # Development dependencies
│   └── README.md                      # Backend documentation

├── lineage-frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/                # Reusable components
│   │   │   │   ├── ErrorState.tsx
│   │   │   │   ├── EmptyState.tsx
│   │   │   │   ├── LoadingSpinner.tsx
│   │   │   │   └── AccessDeniedState.tsx
│   │   │   ├── filters/               # Filter components
│   │   │   ├── grid/                  # Grid/table components
│   │   │   ├── layout/                # Layout components
│   │   │   └── modals/                # Modal components
│   │   ├── features/
│   │   │   ├── fields/                # Field feature
│   │   │   │   ├── FieldListPage.tsx
│   │   │   │   ├── Field360Page.tsx
│   │   │   │   ├── fieldApi.ts
│   │   │   │   └── [components]
│   │   │   ├── comparison/            # Comparison feature
│   │   │   ├── impact/                # Impact analysis feature
│   │   │   ├── graphExplorer/         # Graph explorer feature
│   │   │   ├── search/                # Global search feature
│   │   │   └── dashboard/             # Dashboard feature
│   │   ├── hooks/
│   │   │   └── useDebounce.ts         # Custom hooks
│   │   ├── __tests__/                 # Test files
│   │   ├── app/
│   │   │   ├── queryClient.ts         # React Query configuration
│   │   │   └── [other config]
│   │   ├── App.tsx                    # Root component
│   │   └── main.tsx                   # Entry point
│   ├── public/                        # Static assets
│   ├── vite.config.ts                 # Vite configuration
│   ├── package.json
│   └── README.md                      # Frontend documentation
```

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/field-search-enhancements
```

### 2. Make Changes

Implement your feature following the code standards (see below).

### 3. Run Tests

```bash
# Backend
cd lineage-backend
pytest tests/ -v

# Frontend
cd lineage-frontend
npm run test
```

### 4. Format Code

```bash
# Backend
cd lineage-backend
black app tests
isort app tests

# Frontend
cd lineage-frontend
npm run lint
npm run format
```

### 5. Commit Changes

```bash
git add .
git commit -m "feat: add field search enhancements"
```

### 6. Push and Create PR

```bash
git push origin feature/field-search-enhancements
```

## Frontend Development

### Running the Development Server

```bash
cd lineage-frontend
npm run dev
```

Access the app at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Project Configuration

**Vite Configuration** (`vite.config.ts`):
- Configures React plugin
- Sets API proxy for development
- Defines build output

**TypeScript Configuration** (`tsconfig.json`):
- Strict type checking enabled
- JSX support configured
- Path aliases for imports

### Component Development

#### Creating a New Page

1. Create a directory in `src/features/`:

```bash
mkdir src/features/new-feature
```

2. Create the main page component:

```typescript
// src/features/new-feature/NewFeaturePage.tsx
import { useQuery } from '@tanstack/react-query'
import LoadingSpinner from '../../components/common/LoadingSpinner'
import ErrorState from '../../components/common/ErrorState'

export default function NewFeaturePage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['newFeature'],
    queryFn: async () => {
      const response = await fetch('/api/new-feature')
      if (!response.ok) throw new Error('Failed to fetch')
      return response.json()
    }
  })

  if (isLoading) return <LoadingSpinner message="Loading..." />
  if (error) return <ErrorState message="Error loading data" onRetry={() => refetch()} />

  return (
    <div className="page">
      {/* Page content */}
    </div>
  )
}
```

3. Add route to `App.tsx`:

```typescript
import NewFeaturePage from './features/new-feature/NewFeaturePage'

// In router configuration:
{
  path: '/new-feature',
  element: <NewFeaturePage />
}
```

#### Creating a Reusable Component

```typescript
// src/components/common/MyComponent.tsx
interface MyComponentProps {
  title: string
  onClick?: () => void
}

export default function MyComponent({ title, onClick }: MyComponentProps) {
  return (
    <div className="my-component">
      <h3>{title}</h3>
      {onClick && <button onClick={onClick}>Click me</button>}
    </div>
  )
}
```

### Styling

The project uses **Tailwind CSS** for styling:

```typescript
<div className="flex gap-4 p-6 bg-white rounded-lg shadow">
  <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded">
    Click me
  </button>
</div>
```

### State Management

**React Query** (`@tanstack/react-query`) handles server state:

```typescript
const { data, isLoading, error, refetch } = useQuery({
  queryKey: ['entity', id],
  queryFn: () => fetchEntity(id),
  staleTime: 1000 * 60 * 5,  // 5 minutes
})
```

**Local State** (`useState`) for component state:

```typescript
const [isOpen, setIsOpen] = useState(false)
```

## Backend Development

### Running the Development Server

```bash
cd lineage-backend
python -m uvicorn app.main:app --reload
```

Access Swagger UI at `http://localhost:8000/docs`

### Project Configuration

**Configuration** (`app/core/config.py`):
- Database connections
- CORS settings
- Application settings

**Environment Variables** (`.env`):
```
MSSQL_CONNECTION_STRING=
NEO4J_URI=
NEO4J_USER=
NEO4J_PASSWORD=
CORS_ALLOWED_ORIGINS=
```

### Creating a New Endpoint

#### 1. Create the Endpoint File

```python
# app/api/endpoints/new_feature.py
from fastapi import APIRouter, Query
from app.core.response import SuccessResponse
from app.repositories.repository import Repository

router = APIRouter(prefix="/new-feature", tags=["new-feature"])

@router.get("")
async def get_new_feature(limit: int = Query(10)):
    """Get new feature data."""
    repository = Repository()
    data = await repository.get_data(limit)
    return SuccessResponse(data=data)
```

#### 2. Add Route to Router

```python
# app/api/router.py
from app.api.endpoints.new_feature import router as new_feature_router

api_router = APIRouter(prefix="/api")
api_router.include_router(new_feature_router)
```

#### 3. Create Tests

```python
# tests/test_new_feature.py
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_get_new_feature():
    response = client.get("/api/new-feature")
    assert response.status_code == 200
    data = response.json()
    assert "data" in data
```

### Database Operations

#### MSSQL Queries

```python
from app.db.mssql import get_mssql_connection

def get_fields(search: str, page: int = 1):
    conn = get_mssql_connection()
    query = """
    SELECT field_id, internal_field_name, business_name
    FROM Fields
    WHERE internal_field_name LIKE ? OR business_name LIKE ?
    ORDER BY internal_field_name
    OFFSET ? ROWS FETCH NEXT 20 ROWS ONLY
    """
    offset = (page - 1) * 20
    results = conn.execute(query, (f'%{search}%', f'%{search}%', offset)).fetchall()
    return [dict(row) for row in results]
```

#### Neo4j Queries

```python
from app.db.neo4j import get_neo4j_driver

def find_lineage(field_name: str):
    driver = get_neo4j_driver()
    with driver.session() as session:
        result = session.run("""
        MATCH (f:Field {name: $name})-[r]->(downstream)
        RETURN f, r, downstream
        LIMIT 20
        """, name=field_name)
        return [record.data() for record in result]
```

## Testing

### Backend Testing

```bash
cd lineage-backend

# Run all tests
pytest tests/ -v

# Run specific test file
pytest tests/test_fields.py -v

# Run with coverage
pytest tests/ --cov=app --cov-report=html

# Run specific test
pytest tests/test_fields.py::test_search_fields -v
```

### Frontend Testing

```bash
cd lineage-frontend

# Run tests
npm run test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure

```python
# Backend test example
import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

class TestFields:
    def test_search_fields_returns_200(self):
        response = client.get("/api/fields")
        assert response.status_code == 200

    def test_search_fields_with_query(self):
        response = client.get("/api/fields?search=TRADE")
        assert response.status_code == 200
        data = response.json()
        assert "data" in data
```

## Code Standards

### Python (Backend)

#### Style Guide

- Follow PEP 8
- Use Black for formatting
- Use isort for import sorting

```bash
# Format code
black app tests

# Sort imports
isort app tests

# Lint
flake8 app tests
```

#### Naming Conventions

- `ClassName`: PascalCase
- `function_name`: snake_case
- `CONSTANT_NAME`: UPPER_SNAKE_CASE
- `private_method`: _leading_underscore

#### Documentation

```python
def get_field(field_id: int) -> Dict:
    """
    Retrieve a field by ID.

    Args:
        field_id: The field identifier

    Returns:
        Dictionary containing field details

    Raises:
        NotFoundException: If field not found
    """
    pass
```

### TypeScript/React (Frontend)

#### Style Guide

- Follow ESLint configuration
- Use Prettier for formatting
- Strict TypeScript mode enabled

```bash
# Format code
npm run format

# Lint
npm run lint
```

#### Naming Conventions

- `ComponentName`: PascalCase
- `functionName`: camelCase
- `CONSTANT_NAME`: UPPER_SNAKE_CASE
- `interfaces`: PascalCase with I prefix optional

#### Component Best Practices

```typescript
// Good component structure
interface Props {
  title: string
  onAction?: () => void
}

export default function MyComponent({ title, onAction }: Props) {
  // Hooks first
  const [state, setState] = useState(false)
  const { data } = useQuery(...)

  // Event handlers
  const handleClick = () => {
    // Handle event
  }

  // Render
  return (
    <div>
      <h3>{title}</h3>
    </div>
  )
}
```

## Debugging

### Frontend Debugging

1. **Browser DevTools**
   - Open DevTools (F12 or Cmd+Option+I)
   - Use React DevTools browser extension
   - Check Network tab for API calls

2. **Console Logging**

```typescript
console.log('Debug info:', data)
console.error('Error:', error)
```

3. **VS Code Debugging**

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "chrome",
      "request": "launch",
      "name": "Launch Chrome",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/lineage-frontend",
      "sourceMapPathOverride": {
        "/src/*": "${webspaceRoot}/src/*"
      }
    }
  ]
}
```

### Backend Debugging

1. **Logging**

```python
import logging

logger = logging.getLogger(__name__)
logger.debug("Debug message")
logger.error("Error message", exc_info=True)
```

2. **FastAPI OpenAPI Docs**
   - Navigate to `http://localhost:8000/docs`
   - Try out endpoints with sample data

3. **VS Code Debugging**

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Python: FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload"],
      "jinja": true,
      "cwd": "${workspaceFolder}/lineage-backend"
    }
  ]
}
```

## Common Tasks

### Add a New Environment Variable

1. Add to `.env.example`
2. Add to `.env` (local development)
3. Access in code:

**Backend:**
```python
from app.core.config import settings
print(settings.my_variable)
```

**Frontend:**
```typescript
console.log(import.meta.env.VITE_MY_VARIABLE)
```

### Update Dependencies

**Backend:**
```bash
cd lineage-backend
pip install --upgrade package-name
pip freeze > requirements.txt
```

**Frontend:**
```bash
cd lineage-frontend
npm update package-name
npm audit fix
```

### Database Schema Changes

1. Update SQL scripts in `lineage-backend/scripts/`
2. Run scripts to update databases
3. Update model classes in `app/models/`
4. Update repository queries

### Add a New Filter

1. Update backend endpoint to accept filter parameter
2. Update repository to apply filter in query
3. Update frontend to pass filter to API
4. Update UI to display filter option

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5173
lsof -i :5173

# Kill the process
kill -9 <PID>
```

### Database Connection Issues

```bash
# Check if containers are running
docker ps

# Check logs
docker-compose logs mssql
docker-compose logs neo4j

# Restart services
docker-compose restart
```

### Module Not Found

**Backend:**
```bash
# Ensure virtual environment is activated
source venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

**Frontend:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### API Not Responding

1. Check backend is running: `curl http://localhost:8000`
2. Check logs: `docker-compose logs backend`
3. Check environment variables are set correctly
4. Verify database connections in config

### Build Failures

**Frontend:**
```bash
npm run build 2>&1 | tee build.log
# Check build.log for errors
```

**Backend:**
```bash
python -m pip check
# Check for dependency conflicts
```

---

## Additional Resources

- [React Documentation](https://react.dev)
- [FastAPI Documentation](https://fastapi.tiangolo.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Python Style Guide (PEP 8)](https://pep8.org)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

---

**Last Updated**: May 2026
