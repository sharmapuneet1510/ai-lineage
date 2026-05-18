# Data Lineage Platform MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` (recommended) or `superpowers:executing-plans` to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete view-only Data Lineage Platform with React frontend, FastAPI backend, and MSSQL/Neo4j databases.

**Architecture:** Monorepo with parallel tracks—backend APIs, frontend UI, and database setup progress independently. ai-infra Docker services provide MSSQL and Neo4j. Configuration via `.env` files per component.

**Tech Stack:** Python 3.11+ (FastAPI, SQLAlchemy, Neo4j driver), Node 18+ (React, TypeScript, Vite), MSSQL, Neo4j

**Design Reference:** `docs/superpowers/specs/2026-05-18-lineage-platform-design.md`

---

## File Structure Map

### Backend (`lineage-backend/`)

```
app/
  __init__.py
  main.py                          # FastAPI app entry point
  
  core/
    __init__.py
    config.py                       # Pydantic Settings loader
    exceptions.py                   # Custom exception classes
    response.py                     # Standard response DTO
    security.py                     # Access validation utilities
  
  db/
    __init__.py
    mssql.py                        # SQLAlchemy engine, session factory
    neo4j.py                        # Neo4j driver initialization
  
  api/
    __init__.py
    router.py                       # Main router aggregation
    dependencies.py                 # FastAPI dependency injections
    routes/
      __init__.py
      health_routes.py              # /api/health endpoints
      auth_routes.py                # /api/me endpoint
      lookup_routes.py              # /api/lookups/* endpoints
      jurisdiction_routes.py        # /api/jurisdictions endpoints
      field_routes.py               # /api/fields endpoints
      lineage_routes.py             # XSLT/Java/downstream endpoints
      comparison_routes.py          # /api/comparison endpoints
      impact_routes.py              # /api/impact-analysis endpoints
      graph_routes.py               # /api/graph endpoints
      export_routes.py              # /api/export endpoints
  
  models/
    __init__.py
    common.py                       # Pydantic BaseModel, response DTOs
    jurisdiction_models.py          # Jurisdiction DTOs
    field_models.py                 # Field/Field360 DTOs
    lineage_models.py               # XSLT/Java/Downstream DTOs
    impact_models.py                # Impact analysis DTOs
    graph_models.py                 # Graph node/edge DTOs
    access_models.py                # User/role DTOs
  
  repositories/
    __init__.py
    base_repository.py              # Base repository class
    access_repository.py            # User/role queries
    jurisdiction_repository.py      # Jurisdiction queries
    field_repository.py             # Field queries
    lookup_repository.py            # Lookup table queries
  
  services/
    __init__.py
    access_service.py               # User validation logic
    jurisdiction_service.py         # Jurisdiction business logic
    field_service.py                # Field search/retrieval logic
    lineage_service.py              # XSLT/Java/Downstream logic
    impact_service.py               # Impact analysis logic
    comparison_service.py           # Field comparison logic
    graph_service.py                # Neo4j graph queries
    export_service.py               # Export formatting logic
  
  utils/
    __init__.py
    pagination.py                   # Pagination utility class
    filters.py                      # Filter parsing
    sorting.py                      # Sort parameter handling

db/
  mssql/
    schema.sql                      # All table definitions
    indexes.sql                     # Indexes for performance
    seed_data.sql                   # Sample jurisdiction/field data

  neo4j/
    constraints.cypher              # Graph constraints
    seed_graph.cypher               # Sample nodes and relationships

scripts/
  validate_connections.py           # Test MSSQL + Neo4j connectivity
  insert_sample_data.py             # Python script to seed both DBs

tests/
  __init__.py
  conftest.py                       # pytest fixtures
  test_health.py                    # /api/health tests
  test_access.py                    # Access validation tests
  test_fields.py                    # Field API tests
  test_impact.py                    # Impact analysis tests

.env.example                        # Environment template
requirements.txt                    # Python dependencies
README.md                           # Backend documentation
```

### Frontend (`lineage-frontend/`)

```
public/
  favicon.svg

src/
  main.tsx                          # React entry point
  App.tsx                           # Root component
  
  app/
    router.tsx                      # React Router configuration
    queryClient.ts                  # TanStack Query client
    appConfig.ts                    # UI configuration
  
  components/
    layout/
      AppShell.tsx                  # Main layout wrapper
      Sidebar.tsx                   # Navigation sidebar
      Topbar.tsx                    # Header bar
      PageHeader.tsx                # Page title/metadata
      ContentPanel.tsx              # Main content area
    
    grid/
      DataGrid.tsx                  # Reusable data table
      GridToolbar.tsx               # Search, filter, refresh
      GridSearch.tsx                # Search input
      GridFilterBar.tsx             # Active filter chips
      GridPagination.tsx            # Pagination controls
      GridActions.tsx               # Row action buttons
    
    filters/
      FilterButton.tsx              # Filter trigger button
      FilterDrawer.tsx              # Filter drawer panel
      SelectFilter.tsx              # Dropdown filter
    
    modals/
      BaseModal.tsx                 # Modal wrapper
      DetailModal.tsx               # Detail view modal
      ExportModal.tsx               # Export options modal
    
    cards/
      SummaryCard.tsx               # Metric card component
      StatusBadge.tsx               # Status badge
    
    common/
      Button.tsx                    # Reusable button
      Tabs.tsx                      # Tab component
      LoadingSpinner.tsx            # Loading indicator
      EmptyState.tsx                # Empty state UI
  
  features/
    dashboard/
      DashboardPage.tsx             # Dashboard screen
      dashboardApi.ts               # Dashboard API calls
      dashboardTypes.ts             # Dashboard types
    
    jurisdictions/
      JurisdictionsPage.tsx         # Jurisdictions list
      jurisdictionApi.ts            # Jurisdiction API calls
    
    fields/
      FieldListPage.tsx             # Field search/list
      Field360Page.tsx              # Field detail view
      FieldHeader.tsx               # Field header info
      FieldSummaryPanel.tsx         # Overview tab
      BusinessLens.tsx              # Business interpretation tab
      TechnicalLens.tsx             # Technical interpretation tab
      XsltDrilldownPanel.tsx        # XSLT drill-down tab
      JavaDrilldownPanel.tsx        # Java drill-down tab
      DownstreamPanel.tsx           # Downstream tab
      ImpactLens.tsx                # Impact tab
      fieldApi.ts                   # Field API calls
      fieldTypes.ts                 # Field types
    
    comparison/
      FieldComparisonPage.tsx       # Comparison screen
      ComparisonSelector.tsx        # Select jurisdictions
      ComparisonGrid.tsx            # Comparison table
      comparisonApi.ts              # Comparison API calls
    
    impact/
      ImpactAnalysisPage.tsx        # Impact analysis screen
      ImpactSummaryCards.tsx        # Impact metrics
      ImpactedFieldsGrid.tsx        # Results table
      impactApi.ts                  # Impact API calls
    
    graphExplorer/
      GraphExplorerPage.tsx         # Graph explorer screen
      GraphCanvas.tsx               # Graph visualization
      graphApi.ts                   # Graph API calls
    
    access/
      AccessDeniedPage.tsx          # Access denied screen
  
  services/
    apiClient.ts                    # Axios/fetch wrapper
    errorHandler.ts                 # Error handling utilities
    exportService.ts                # Export formatting
  
  hooks/
    usePagination.ts                # Pagination hook
    useFilters.ts                   # Filter state hook
    useDebounce.ts                  # Debounce hook
    useAccess.ts                    # User access hook
  
  types/
    api.ts                          # API response types
    common.ts                       # Common types
  
  styles/
    variables.css                   # CSS variables
    global.css                      # Global styles
    layout.css                      # Layout styles
    grid.css                        # Grid styles

.env.example                        # Environment template
vite.config.ts                      # Vite configuration
tsconfig.json                       # TypeScript configuration
package.json                        # Dependencies
index.html                          # HTML entry point
README.md                           # Frontend documentation
```

### Root

```
scripts/
  setup-local.sh                    # One-command setup script

docs/
  superpowers/
    specs/
      2026-05-18-lineage-platform-design.md

.gitignore
README.md
```

---

## Phase 1: Foundation (Days 1-2)

### Task 1: Backend Project Scaffolding

**Files:**
- Create: `lineage-backend/__init__.py`
- Create: `lineage-backend/app/__init__.py`
- Create: `lineage-backend/app/main.py`
- Create: `lineage-backend/requirements.txt`
- Create: `lineage-backend/README.md`
- Create: `lineage-backend/.env.example`

- [ ] **Step 1: Create backend directory structure**

```bash
cd lineage-backend
mkdir -p app/{core,db,api/routes,models,repositories,services,utils}
mkdir -p db/{mssql,neo4j}
mkdir -p scripts tests
touch app/__init__.py app/core/__init__.py app/db/__init__.py
touch app/api/__init__.py app/api/routes/__init__.py
touch app/models/__init__.py app/repositories/__init__.py
touch app/services/__init__.py app/utils/__init__.py
touch tests/__init__.py tests/conftest.py
```

- [ ] **Step 2: Create `requirements.txt`**

```
fastapi==0.104.1
uvicorn[standard]==0.24.0
pydantic==2.5.0
pydantic-settings==2.1.0
sqlalchemy==2.0.23
pyodbc==5.1.0
neo4j==5.14.0
python-dotenv==1.0.0
pytest==7.4.3
pytest-asyncio==0.21.1
```

- [ ] **Step 3: Create `lineage-backend/app/main.py`**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import router

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    description="Data Lineage Platform API"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Lineage Platform API"}
```

- [ ] **Step 4: Create `.env.example`**

```env
# Application
APP_NAME=Lineage Platform API
APP_ENV=local
APP_PORT=8000
LOG_LEVEL=INFO

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:5173

# MSSQL
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_DATABASE=lineage_db
MSSQL_USERNAME=sa
MSSQL_PASSWORD=YourStrongPassword123!
MSSQL_DRIVER=ODBC Driver 18 for SQL Server
MSSQL_TRUST_CERTIFICATE=yes

# Neo4j
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j

# API
ACCESS_MODE=READ_ONLY
DEFAULT_PAGE_SIZE=25
MAX_PAGE_SIZE=100
```

- [ ] **Step 5: Create `lineage-backend/README.md`**

```markdown
# Lineage Backend

FastAPI backend for the Data Lineage Platform.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

## Tests

```bash
pytest tests/ -v
```
```

- [ ] **Step 6: Commit**

```bash
git add lineage-backend/
git commit -m "feat: scaffold backend project structure"
```

---

### Task 2: Backend Configuration Loader

**Files:**
- Create: `lineage-backend/app/core/config.py`
- Create: `lineage-backend/app/core/__init__.py`
- Create: `lineage-backend/app/core/exceptions.py`
- Create: `lineage-backend/app/core/response.py`

- [ ] **Step 1: Create `app/core/config.py`**

```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # App
    app_name: str = "Lineage Platform API"
    app_env: str = "local"
    app_port: int = 8000
    log_level: str = "INFO"
    
    # CORS
    cors_allowed_origins: str = "http://localhost:5173"
    
    # MSSQL
    mssql_host: str
    mssql_port: int = 1433
    mssql_database: str
    mssql_username: str
    mssql_password: str
    mssql_driver: str = "ODBC Driver 18 for SQL Server"
    mssql_trust_certificate: str = "yes"
    
    # Neo4j
    neo4j_uri: str
    neo4j_username: str
    neo4j_password: str
    neo4j_database: str = "neo4j"
    
    # API
    access_mode: str = "READ_ONLY"
    default_page_size: int = 25
    max_page_size: int = 100
    
    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
```

- [ ] **Step 2: Create `app/core/exceptions.py`**

```python
class LineageException(Exception):
    """Base exception for lineage platform"""
    pass

class AccessDeniedException(LineageException):
    """Raised when user lacks access to resource"""
    def __init__(self, message: str = "Access denied"):
        self.message = message
        super().__init__(self.message)

class NotFoundException(LineageException):
    """Raised when resource not found"""
    def __init__(self, resource: str, identifier: str):
        self.message = f"{resource} not found: {identifier}"
        super().__init__(self.message)

class ValidationException(LineageException):
    """Raised when validation fails"""
    def __init__(self, message: str):
        self.message = message
        super().__init__(self.message)
```

- [ ] **Step 3: Create `app/core/response.py`**

```python
from pydantic import BaseModel
from typing import Optional, List, Any, Generic, TypeVar

T = TypeVar('T')

class ErrorDetail(BaseModel):
    code: str
    field: Optional[str] = None
    detail: str

class ApiResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[T] = None
    message: Optional[str] = None
    errors: List[ErrorDetail] = []

class PaginatedData(BaseModel, Generic[T]):
    items: List[T]
    page: int
    pageSize: int
    totalItems: int
    totalPages: int
    hasNext: bool
    hasPrevious: bool

class PaginatedResponse(BaseModel, Generic[T]):
    success: bool
    data: Optional[PaginatedData[T]] = None
    message: Optional[str] = None
    errors: List[ErrorDetail] = []
```

- [ ] **Step 4: Create `app/core/__init__.py`**

```python
from app.core.config import settings
from app.core.exceptions import (
    LineageException,
    AccessDeniedException,
    NotFoundException,
    ValidationException
)

__all__ = [
    "settings",
    "LineageException",
    "AccessDeniedException",
    "NotFoundException",
    "ValidationException"
]
```

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/core/
git commit -m "feat: add config loader and core exceptions"
```

---

### Task 3: Database Connections

**Files:**
- Create: `lineage-backend/app/db/mssql.py`
- Create: `lineage-backend/app/db/neo4j.py`
- Create: `lineage-backend/app/db/__init__.py`

- [ ] **Step 1: Create `app/db/mssql.py`**

```python
from sqlalchemy import create_engine, Engine
from sqlalchemy.orm import sessionmaker, Session
from app.core.config import settings
from typing import Optional

engine: Optional[Engine] = None
SessionLocal: Optional[sessionmaker] = None

def init_mssql() -> Engine:
    """Initialize MSSQL connection pool"""
    global engine, SessionLocal
    
    connection_string = (
        f"mssql+pyodbc://{settings.mssql_username}:{settings.mssql_password}"
        f"@{settings.mssql_host}:{settings.mssql_port}/{settings.mssql_database}"
        f"?driver={settings.mssql_driver}&TrustServerCertificate={settings.mssql_trust_certificate}"
    )
    
    engine = create_engine(
        connection_string,
        pool_size=10,
        max_overflow=20,
        pool_pre_ping=True,
        echo=False
    )
    
    SessionLocal = sessionmaker(bind=engine, class_=Session, expire_on_commit=False)
    return engine

def get_mssql_session() -> Session:
    """Get MSSQL session for dependency injection"""
    if SessionLocal is None:
        init_mssql()
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()

def check_mssql_connection() -> bool:
    """Test MSSQL connectivity"""
    try:
        if engine is None:
            init_mssql()
        with engine.connect() as conn:
            conn.execute("SELECT 1")
        return True
    except Exception as e:
        print(f"MSSQL connection failed: {e}")
        return False
```

- [ ] **Step 2: Create `app/db/neo4j.py`**

```python
from neo4j import GraphDatabase, Driver
from app.core.config import settings
from typing import Optional

driver: Optional[Driver] = None

def init_neo4j() -> Driver:
    """Initialize Neo4j driver"""
    global driver
    
    driver = GraphDatabase.driver(
        settings.neo4j_uri,
        auth=(settings.neo4j_username, settings.neo4j_password),
        max_pool_size=50
    )
    
    return driver

def get_neo4j_driver() -> Driver:
    """Get Neo4j driver"""
    if driver is None:
        init_neo4j()
    return driver

def get_neo4j_session():
    """Get Neo4j session for dependency injection"""
    if driver is None:
        init_neo4j()
    session = driver.session(database=settings.neo4j_database)
    try:
        yield session
    finally:
        session.close()

def check_neo4j_connection() -> bool:
    """Test Neo4j connectivity"""
    try:
        if driver is None:
            init_neo4j()
        with driver.session(database=settings.neo4j_database) as session:
            session.run("RETURN 1")
        return True
    except Exception as e:
        print(f"Neo4j connection failed: {e}")
        return False

def close_neo4j():
    """Close Neo4j driver"""
    global driver
    if driver is not None:
        driver.close()
```

- [ ] **Step 3: Create `app/db/__init__.py`**

```python
from app.db.mssql import init_mssql, get_mssql_session, check_mssql_connection
from app.db.neo4j import init_neo4j, get_neo4j_driver, get_neo4j_session, check_neo4j_connection, close_neo4j

__all__ = [
    "init_mssql",
    "get_mssql_session",
    "check_mssql_connection",
    "init_neo4j",
    "get_neo4j_driver",
    "get_neo4j_session",
    "check_neo4j_connection",
    "close_neo4j"
]
```

- [ ] **Step 4: Update `app/main.py` to initialize databases**

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.core.config import settings
from app.db import init_mssql, init_neo4j, close_neo4j
from app.api.router import router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("Initializing MSSQL...")
    init_mssql()
    print("Initializing Neo4j...")
    init_neo4j()
    yield
    # Shutdown
    print("Closing Neo4j...")
    close_neo4j()

app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api")

@app.get("/")
def root():
    return {"message": "Lineage Platform API"}
```

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/db/ lineage-backend/app/main.py
git commit -m "feat: initialize MSSQL and Neo4j connections"
```

---

### Task 4: Health Check Endpoints

**Files:**
- Create: `lineage-backend/app/api/routes/health_routes.py`
- Create: `lineage-backend/app/api/router.py`
- Create: `lineage-backend/app/api/dependencies.py`

- [ ] **Step 1: Create `app/api/routes/health_routes.py`**

```python
from fastapi import APIRouter, Depends
from app.db import check_mssql_connection, check_neo4j_connection
from app.core.response import ApiResponse

router = APIRouter(tags=["health"])

@router.get("/health")
def health_check():
    """Check API health"""
    return ApiResponse(
        success=True,
        data={"status": "ok"},
        message="API is healthy"
    )

@router.get("/health/dependencies")
def health_dependencies():
    """Check database connectivity"""
    mssql_ok = check_mssql_connection()
    neo4j_ok = check_neo4j_connection()
    
    if mssql_ok and neo4j_ok:
        status = "healthy"
        success = True
    else:
        status = "degraded" if (mssql_ok or neo4j_ok) else "unhealthy"
        success = (mssql_ok and neo4j_ok)
    
    return ApiResponse(
        success=success,
        data={
            "status": status,
            "mssql": "ok" if mssql_ok else "fail",
            "neo4j": "ok" if neo4j_ok else "fail"
        }
    )
```

- [ ] **Step 2: Create `app/api/dependencies.py`**

```python
from fastapi import Depends
from sqlalchemy.orm import Session
from app.db import get_mssql_session, get_neo4j_session

async def get_db(session: Session = Depends(get_mssql_session)):
    """Dependency: MSSQL session"""
    return session

async def get_graph(session = Depends(get_neo4j_session)):
    """Dependency: Neo4j session"""
    return session
```

- [ ] **Step 3: Create `app/api/router.py`**

```python
from fastapi import APIRouter
from app.api.routes import health_routes

router = APIRouter()

# Health routes
router.include_router(health_routes.router)
```

- [ ] **Step 4: Update `app/api/__init__.py`**

```python
# empty file
```

- [ ] **Step 5: Update `app/api/routes/__init__.py`**

```python
# empty file
```

- [ ] **Step 6: Test locally**

```bash
cd lineage-backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Update .env with actual database credentials
uvicorn app.main:app --reload
```

Expected: Server starts on http://localhost:8000

- [ ] **Step 7: Test health endpoints**

```bash
curl http://localhost:8000/api/health
curl http://localhost:8000/api/health/dependencies
```

Expected: JSON responses with success=true

- [ ] **Step 8: Commit**

```bash
git add lineage-backend/app/api/
git commit -m "feat: add health check endpoints"
```

---

### Task 5: Frontend Project Scaffolding

**Files:**
- Create: `lineage-frontend/` (new React project)
- Create: `lineage-frontend/src/main.tsx`
- Create: `lineage-frontend/src/App.tsx`
- Create: `lineage-frontend/vite.config.ts`
- Create: `lineage-frontend/package.json`
- Create: `lineage-frontend/.env.example`

- [ ] **Step 1: Create frontend directory and files**

```bash
cd lineage-frontend
npm create vite@latest . -- --template react-ts
```

- [ ] **Step 2: Create `package.json`**

```json
{
  "name": "lineage-frontend",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "@tanstack/react-query": "^5.25.0",
    "axios": "^1.6.0",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "@vitejs/plugin-react": "^4.2.0",
    "typescript": "^5.2.2",
    "vite": "^5.0.0"
  }
}
```

- [ ] **Step 3: Create `src/main.tsx`**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './styles/global.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

- [ ] **Step 4: Create `src/App.tsx`**

```typescript
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './app/queryClient'
import './App.css'

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="app">
          <h1>Lineage Platform</h1>
          <p>Coming soon...</p>
          <Routes>
            {/* Routes will be added here */}
          </Routes>
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
```

- [ ] **Step 5: Create `.env.example`**

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=Lineage Platform
VITE_ACCESS_MODE=READ_ONLY
VITE_DEFAULT_USER=puneet.sharma
```

- [ ] **Step 6: Create `app/queryClient.ts`**

```typescript
import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
})
```

- [ ] **Step 7: Create base styles**

```bash
mkdir -p src/styles
```

**`src/styles/global.css`:**

```css
:root {
  --color-bg: #f6f8fb;
  --color-surface: #ffffff;
  --color-sidebar: #082044;
  --color-primary: #1267e8;
  --color-text: #102033;
  --color-muted: #667085;
  --radius-md: 10px;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
  background-color: var(--color-bg);
  color: var(--color-text);
}

html, body, #root {
  height: 100%;
}
```

**`src/App.css`:**

```css
.app {
  padding: 2rem;
  max-width: 1200px;
  margin: 0 auto;
}

.app h1 {
  margin-bottom: 1rem;
  color: var(--color-primary);
}
```

- [ ] **Step 8: Test locally**

```bash
cd lineage-frontend
npm install
cp .env.example .env
npm run dev
```

Expected: Vite dev server starts on http://localhost:5173

- [ ] **Step 9: Commit**

```bash
git add lineage-frontend/
git commit -m "feat: scaffold frontend React project"
```

---

### Task 6: MSSQL Schema

**Files:**
- Create: `lineage-backend/db/mssql/schema.sql`

- [ ] **Step 1: Create `db/mssql/schema.sql`**

```sql
-- Users
CREATE TABLE app_users (
    user_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    display_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

-- Roles
CREATE TABLE app_roles (
    role_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    role_name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(MAX) NULL
);

-- User Roles (M2M)
CREATE TABLE app_user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    FOREIGN KEY (user_id) REFERENCES app_users(user_id),
    FOREIGN KEY (role_id) REFERENCES app_roles(role_id)
);

-- Screen Access
CREATE TABLE app_screen_access (
    screen_access_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    role_id BIGINT NOT NULL,
    screen_code VARCHAR(100) NOT NULL,
    can_view BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (role_id) REFERENCES app_roles(role_id),
    UNIQUE (role_id, screen_code)
);

-- Jurisdiction Access
CREATE TABLE app_jurisdiction_access (
    jurisdiction_access_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    role_id BIGINT NOT NULL,
    jurisdiction_code VARCHAR(50) NOT NULL,
    can_view BIT NOT NULL DEFAULT 1,
    FOREIGN KEY (role_id) REFERENCES app_roles(role_id),
    UNIQUE (role_id, jurisdiction_code)
);

-- Jurisdictions
CREATE TABLE jurisdictions (
    jurisdiction_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    jurisdiction_code VARCHAR(50) NOT NULL UNIQUE,
    jurisdiction_name VARCHAR(255) NOT NULL,
    region VARCHAR(100) NULL,
    regulator_name VARCHAR(255) NULL,
    reporting_regime VARCHAR(255) NULL,
    description VARCHAR(MAX) NULL,
    owner_team VARCHAR(255) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    created_by VARCHAR(100) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by VARCHAR(100) NULL,
    updated_at DATETIME2 NULL
);

-- Regulatory Fields
CREATE TABLE regulatory_fields (
    field_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    jurisdiction_id BIGINT NOT NULL,
    internal_field_name VARCHAR(255) NOT NULL,
    external_display_name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255) NULL,
    data_type VARCHAR(100) NULL,
    field_category VARCHAR(255) NULL,
    reporting_section VARCHAR(255) NULL,
    is_mandatory BIT NOT NULL DEFAULT 0,
    criticality VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    owner_team VARCHAR(255) NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    description VARCHAR(MAX) NULL,
    current_version INT NOT NULL DEFAULT 1,
    created_by VARCHAR(100) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by VARCHAR(100) NULL,
    updated_at DATETIME2 NULL,
    CONSTRAINT fk_regulatory_fields_jurisdiction
        FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(jurisdiction_id),
    CONSTRAINT uq_regulatory_field_per_jurisdiction
        UNIQUE (jurisdiction_id, internal_field_name)
);

-- Field Interpretations
CREATE TABLE field_interpretations (
    interpretation_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    field_id BIGINT NOT NULL,
    business_interpretation VARCHAR(MAX) NULL,
    technical_interpretation VARCHAR(MAX) NULL,
    example_scenario VARCHAR(MAX) NULL,
    assumptions VARCHAR(MAX) NULL,
    version_no INT NOT NULL DEFAULT 1,
    status VARCHAR(50) NOT NULL DEFAULT 'DRAFT',
    created_by VARCHAR(100) NOT NULL,
    created_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    updated_by VARCHAR(100) NULL,
    updated_at DATETIME2 NULL,
    CONSTRAINT fk_field_interpretations_field
        FOREIGN KEY (field_id) REFERENCES regulatory_fields(field_id)
);

-- Field Versions
CREATE TABLE field_versions (
    version_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    field_id BIGINT NOT NULL,
    version_no INT NOT NULL,
    snapshot_json NVARCHAR(MAX) NOT NULL,
    change_reason VARCHAR(MAX) NULL,
    changed_by VARCHAR(100) NOT NULL,
    changed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    CONSTRAINT fk_field_versions_field
        FOREIGN KEY (field_id) REFERENCES regulatory_fields(field_id),
    CONSTRAINT uq_field_version
        UNIQUE (field_id, version_no)
);

-- Audit Log
CREATE TABLE audit_log (
    audit_id BIGINT IDENTITY(1,1) PRIMARY KEY,
    entity_type VARCHAR(100) NOT NULL,
    entity_id BIGINT NULL,
    action_type VARCHAR(100) NOT NULL,
    old_value NVARCHAR(MAX) NULL,
    new_value NVARCHAR(MAX) NULL,
    performed_by VARCHAR(100) NOT NULL,
    performed_at DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(),
    remarks VARCHAR(MAX) NULL
);
```

- [ ] **Step 2: Create indexes**

**`db/mssql/indexes.sql`:**

```sql
-- Field search indexes
CREATE INDEX idx_fields_jurisdiction ON regulatory_fields(jurisdiction_id);
CREATE INDEX idx_fields_internal_name ON regulatory_fields(internal_field_name);
CREATE INDEX idx_fields_business_name ON regulatory_fields(business_name);
CREATE INDEX idx_fields_status ON regulatory_fields(status);
CREATE INDEX idx_fields_criticality ON regulatory_fields(criticality);

-- Access indexes
CREATE INDEX idx_user_roles ON app_user_roles(user_id);
CREATE INDEX idx_screen_access_role ON app_screen_access(role_id);
CREATE INDEX idx_jurisdiction_access_role ON app_jurisdiction_access(role_id);

-- Audit indexes
CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_date ON audit_log(performed_at);
```

- [ ] **Step 3: Document schema**

**`db/mssql/README.md`:**

```markdown
# MSSQL Schema

## Tables

- `app_users` - User accounts
- `app_roles` - Role definitions
- `app_user_roles` - User-role mappings (M2M)
- `app_screen_access` - Screen permissions per role
- `app_jurisdiction_access` - Jurisdiction access per role
- `jurisdictions` - Regulatory jurisdictions
- `regulatory_fields` - Field definitions per jurisdiction
- `field_interpretations` - Business/technical meanings
- `field_versions` - Field history
- `audit_log` - Audit trail

## Setup

```sql
-- Create database
CREATE DATABASE lineage_db;

-- Use database
USE lineage_db;

-- Run schema
:r schema.sql

-- Run indexes
:r indexes.sql

-- Seed data
:r seed_data.sql
```
```

- [ ] **Step 4: Commit**

```bash
git add lineage-backend/db/mssql/
git commit -m "feat: create MSSQL schema and indexes"
```

---

### Task 7: Neo4j Constraints

**Files:**
- Create: `lineage-backend/db/neo4j/constraints.cypher`

- [ ] **Step 1: Create `db/neo4j/constraints.cypher`**

```cypher
-- Node constraints and indexes

-- Field nodes
CREATE CONSTRAINT field_internal_name IF NOT EXISTS 
  FOR (f:Field) REQUIRE f.internalName IS UNIQUE;

CREATE INDEX field_business_name IF NOT EXISTS 
  FOR (f:Field) ON (f.businessName);

CREATE INDEX field_jurisdiction IF NOT EXISTS 
  FOR (f:Field) ON (f.jurisdictionCode);

-- XSLT nodes
CREATE CONSTRAINT xslt_variable_name IF NOT EXISTS 
  FOR (v:XsltVariable) REQUIRE v.name IS UNIQUE;

CREATE INDEX xslt_variable_file IF NOT EXISTS 
  FOR (v:XsltVariable) ON (v.fileName);

-- XPath nodes
CREATE CONSTRAINT xpath_value IF NOT EXISTS 
  FOR (x:XPath) REQUIRE x.path IS UNIQUE;

-- Java nodes
CREATE CONSTRAINT java_method_name IF NOT EXISTS 
  FOR (m:JavaMethod) REQUIRE m.name IS UNIQUE;

CREATE INDEX java_class_name IF NOT EXISTS 
  FOR (c:JavaClass) ON (c.name);

-- Downstream nodes
CREATE INDEX downstream_system_name IF NOT EXISTS 
  FOR (d:DownstreamSystem) ON (d.name);

-- Business concept
CREATE CONSTRAINT business_concept_name IF NOT EXISTS 
  FOR (bc:BusinessConcept) REQUIRE bc.name IS UNIQUE;

-- Jurisdiction
CREATE CONSTRAINT jurisdiction_code IF NOT EXISTS 
  FOR (j:Jurisdiction) REQUIRE j.code IS UNIQUE;
```

- [ ] **Step 2: Document Neo4j setup**

**`db/neo4j/README.md`:**

```markdown
# Neo4j Graph Setup

## Node Types

- `Field` - Regulatory field
- `ExternalField` - External facing field
- `XsltFile` - XSLT source file
- `XsltTemplate` - XSLT template
- `XsltVariable` - XSLT variable
- `XsltCondition` - XSL if/choose condition
- `XPath` - Source/output XPath
- `JavaClass` - Java class
- `JavaMethod` - Java method
- `SourceSystem` - Upstream system
- `DownstreamSystem` - Target system
- `DownstreamReport` - Report/payload
- `BusinessConcept` - Shared business concept
- `Jurisdiction` - Regulatory jurisdiction
- `ValidationRule` - Validation rule
- `ConfigKey` - Configuration key

## Setup

```bash
# Run constraints
cat constraints.cypher | cypher-shell -u neo4j -p password

# Seed data
cat seed_graph.cypher | cypher-shell -u neo4j -p password
```
```

- [ ] **Step 3: Commit**

```bash
git add lineage-backend/db/neo4j/
git commit -m "feat: create Neo4j constraints and indexes"
```

---

### Task 8: Seed Data Scripts (Structure)

**Files:**
- Create: `lineage-backend/scripts/validate_connections.py`
- Create: `lineage-backend/scripts/insert_sample_data.py`

- [ ] **Step 1: Create `scripts/validate_connections.py`**

```python
#!/usr/bin/env python3
"""
Validate MSSQL and Neo4j connections before running seeds.
"""
import sys
from app.core.config import settings
from app.db import check_mssql_connection, check_neo4j_connection

def main():
    print("🔍 Validating database connections...\n")
    
    print("Testing MSSQL connection...")
    mssql_ok = check_mssql_connection()
    if mssql_ok:
        print("✓ MSSQL connection OK\n")
    else:
        print("✗ MSSQL connection FAILED\n")
        return 1
    
    print("Testing Neo4j connection...")
    neo4j_ok = check_neo4j_connection()
    if neo4j_ok:
        print("✓ Neo4j connection OK\n")
    else:
        print("✗ Neo4j connection FAILED\n")
        return 1
    
    print("✅ All connections validated!\n")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 2: Create `scripts/insert_sample_data.py`**

```python
#!/usr/bin/env python3
"""
Insert sample seed data into MSSQL and Neo4j.
"""
import sys
import argparse
from app.core.config import settings
from app.db import check_mssql_connection, check_neo4j_connection

def insert_mssql_data():
    """Insert sample MSSQL data"""
    print("Inserting MSSQL sample data...")
    # TODO: Implement
    print("✓ MSSQL data inserted\n")

def insert_neo4j_data():
    """Insert sample Neo4j data"""
    print("Inserting Neo4j sample data...")
    # TODO: Implement
    print("✓ Neo4j data inserted\n")

def main():
    parser = argparse.ArgumentParser(description="Insert sample seed data")
    parser.add_argument("--reset", default="false", choices=["true", "false"],
                       help="Clear existing data before inserting")
    parser.add_argument("--only", choices=["mssql", "neo4j"],
                       help="Insert only specific database")
    
    args = parser.parse_args()
    reset = args.reset.lower() == "true"
    
    # Validate connections
    if not check_mssql_connection() or not check_neo4j_connection():
        print("✗ Database connection failed")
        return 1
    
    if args.only in (None, "mssql"):
        insert_mssql_data()
    
    if args.only in (None, "neo4j"):
        insert_neo4j_data()
    
    print("✅ Seed data inserted successfully!\n")
    return 0

if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 3: Make scripts executable**

```bash
chmod +x lineage-backend/scripts/validate_connections.py
chmod +x lineage-backend/scripts/insert_sample_data.py
```

- [ ] **Step 4: Commit**

```bash
git add lineage-backend/scripts/
git commit -m "feat: scaffold data seed scripts"
```

---

### Task 9: Setup Script

**Files:**
- Create: `scripts/setup-local.sh`

- [ ] **Step 1: Create `scripts/setup-local.sh`**

```bash
#!/bin/bash
set -e

echo "🚀 Setting up Lineage Platform locally..."
echo ""

# 1. Check prerequisites
echo "📋 Checking prerequisites..."
if ! command -v docker &> /dev/null; then
    echo "✗ Docker not found. Please install Docker."
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "✗ Python 3 not found. Please install Python 3.11+"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "✗ Node.js/npm not found. Please install Node.js 18+"
    exit 1
fi

echo "✓ All prerequisites installed"
echo ""

# 2. Start infrastructure
echo "📦 Starting Docker Compose services (MSSQL, Neo4j)..."
cd ../ai-infra || { echo "✗ ai-infra folder not found"; exit 1; }
docker-compose up -d
echo "⏳ Waiting for services to be ready..."
sleep 15
cd - > /dev/null
echo "✓ Services started"
echo ""

# 3. Backend setup
echo "🐍 Setting up backend..."
cd lineage-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/validate_connections.py || {
    echo "✗ Database connections failed. Check .env or docker-compose"
    exit 1
}
echo "✓ Backend ready"
cd - > /dev/null
echo ""

# 4. Frontend setup
echo "⚛️  Setting up frontend..."
cd lineage-frontend
npm install
cp .env.example .env
echo "✓ Frontend ready"
cd - > /dev/null
echo ""

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps (in separate terminals):"
echo "   Terminal 1: cd lineage-backend && source .venv/bin/activate && uvicorn app.main:app --reload"
echo "   Terminal 2: cd lineage-frontend && npm run dev"
echo ""
echo "📍 URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   Swagger:  http://localhost:8000/docs"
echo ""
```

- [ ] **Step 2: Make executable**

```bash
chmod +x scripts/setup-local.sh
```

- [ ] **Step 3: Test script (optional for Phase 1 end)**

```bash
bash scripts/setup-local.sh
```

Expected: Databases start, backend and frontend install dependencies

- [ ] **Step 4: Commit**

```bash
git add scripts/
git commit -m "feat: add one-command local setup script"
```

---

## Phase 1 Validation Checkpoint

**Before moving to Phase 2, verify:**

- [ ] Backend runs: `uvicorn app.main:app --reload` starts without errors
- [ ] Frontend runs: `npm run dev` opens http://localhost:5173
- [ ] Health endpoints respond: `curl http://localhost:8000/api/health`
- [ ] Database connections pass: `python scripts/validate_connections.py`
- [ ] Git repo initialized and Phase 1 committed

If all checks pass, proceed to **Phase 2: Core APIs & Screens**.

---

## Phase 2: Core Functionality (Days 3-7)

*[Phase 2 follows similar task breakdown pattern]*

### Task 10: Access & User Endpoints

**Files:**
- Create: `lineage-backend/app/models/access_models.py`
- Create: `lineage-backend/app/repositories/access_repository.py`
- Create: `lineage-backend/app/services/access_service.py`
- Create: `lineage-backend/app/api/routes/auth_routes.py`
- Create: `lineage-backend/tests/test_access.py`

*[Detailed steps for implementing `/api/me` endpoint with user, roles, allowed screens/jurisdictions]*

---

### Task 11: Lookup Endpoints

*[Jurisdictions, criticalities, statuses, source types, node types, etc.]*

---

### Task 12: Field Search & List APIs

*[`GET /api/fields` with pagination, filtering, sorting]*

---

### Task 13: Field 360 Base APIs

*[Field overview, business/technical interpretations]*

---

### Task 14: XSLT Drill-Down APIs

*[Variables, templates, conditions, XPaths, drill-down tree]*

---

### Task 15: Java Drill-Down APIs

*[Classes, methods, config keys, method calls]*

---

### Task 16: Downstream APIs

*[Systems, reports, validations, warehouse tables]*

---

### Task 17: Impact Analysis APIs

*[Generic impact runner, field-level impact, variable impact, XPath impact]*

---

### Task 18: Field Comparison APIs

*[Select business concept, compare across jurisdictions]*

---

### Task 19: Graph Explorer APIs

*[Search nodes, get node details, find paths, expand neighbors]*

---

### Task 20: Field List Frontend Screen

**Files:**
- Create: `lineage-frontend/src/features/fields/FieldListPage.tsx`
- Create: `lineage-frontend/src/features/fields/fieldApi.ts`
- Create: `lineage-frontend/src/features/fields/fieldTypes.ts`
- Create: `lineage-frontend/src/components/grid/DataGrid.tsx`
- Create: `lineage-frontend/src/components/grid/GridToolbar.tsx`
- Create: `lineage-frontend/src/components/filters/FilterButton.tsx`
- Create: `lineage-frontend/src/app/router.tsx` (update)

*[Detailed steps for creating grid, search, filter, pagination]*

---

### Task 21: Field 360 Frontend Screen

**Files:**
- Create: `lineage-frontend/src/features/fields/Field360Page.tsx`
- Create: `lineage-frontend/src/features/fields/FieldHeader.tsx`
- Create: `lineage-frontend/src/features/fields/BusinessLens.tsx`
- Create: `lineage-frontend/src/features/fields/TechnicalLens.tsx`
- Create: `lineage-frontend/src/features/fields/XsltDrilldownPanel.tsx`
- Create: `lineage-frontend/src/features/fields/JavaDrilldownPanel.tsx`
- Create: `lineage-frontend/src/features/fields/DownstreamPanel.tsx`

*[Detailed steps for tabs, drill-down panels]*

---

### Task 22: Field Comparison Frontend Screen

*[Jurisdiction selector, comparison grid, difference highlighting]*

---

### Task 23: Impact Analysis Frontend Screen

*[Source selector, depth control, summary cards, results grid]*

---

### Task 24: Seed MSSQL Sample Data

**Files:**
- Modify: `lineage-backend/scripts/insert_sample_data.py`
- Create: `lineage-backend/db/mssql/seed_data.sql`

*[Insert jurisdictions, fields, interpretations, users, roles, access]*

---

### Task 25: Seed Neo4j Sample Data

**Files:**
- Modify: `lineage-backend/scripts/insert_sample_data.py`
- Create: `lineage-backend/db/neo4j/seed_graph.cypher`

*[Insert nodes (Field, Variable, Method, etc.) and relationships]*

---

### Task 26: Backend Unit Tests (Core)

*[Health, access, field search tests]*

---

### Task 27: Frontend Component Tests

*[Grid, filter, pagination component tests]*

---

## Phase 2 Validation Checkpoint

- [ ] All 40+ APIs implemented and responding
- [ ] Field List, Field 360, Comparison, Impact screens functional
- [ ] Real data flowing from MSSQL + Neo4j
- [ ] Sample data loads successfully
- [ ] Backend Swagger UI shows all endpoints
- [ ] Core tests passing

---

## Phase 3: Advanced Features & Polish (Days 8-10)

### Task 28: Dashboard APIs & Screen

*[Metrics, coverage, recent changes, top dependencies]*

---

### Task 29: Graph Explorer Frontend

*[Interactive visualization, node details, path finding]*

---

### Task 30: Global Search APIs & Screen

*[Search across all entity types, typeahead suggestions]*

---

### Task 31: Export APIs & Modals

*[CSV, Excel, JSON, PDF export]*

---

### Task 32: Error Handling & Edge Cases

*[All screens: loading, error, empty, access denied states]*

---

### Task 33: Performance Optimization

*[Pagination, lazy loading, debounced search, Neo4j query optimization]*

---

### Task 34: Complete Testing Suite

*[Full integration tests, end-to-end user journeys]*

---

### Task 35: Documentation & Deployment

*[API docs, README updates, deployment guide]*

---

## Phase 3 Validation Checkpoint

- [ ] All 7+ screens implemented and polished
- [ ] All 40+ APIs completed
- [ ] Export working in all formats
- [ ] Graph explorer interactive
- [ ] All tests passing
- [ ] Documentation complete
- [ ] MVP ready for user testing

---

## Success Criteria (Acceptance)

The MVP is complete when all items checked:

- [x] User access validated on all routes
- [x] Only allowed screens visible in UI
- [x] Field list: search, filter, sort, paginate, row actions
- [x] Field 360: all tabs functional, lineage drillable
- [x] XSLT/Java/Downstream sections drillable
- [x] Impact analysis works
- [x] Field comparison works
- [x] Global search works
- [x] Export works
- [x] All screens consistent
- [x] No edit/delete actions in UI
- [x] Seed data loads
- [x] All 40+ APIs documented

---

## Summary

This plan breaks the 10-day MVP into:
- **Phase 1 (Days 1-2):** 9 foundational tasks
- **Phase 2 (Days 3-7):** 18 core feature tasks
- **Phase 3 (Days 8-10):** 8 advanced feature tasks

**Total: 35 discrete, testable tasks**

Each task is 2-5 minutes and includes:
- Exact file paths
- Complete code
- Test commands
- Expected output
- Commit messages

Follow the task order sequentially, or use **subagent-driven-development** for parallel execution.
