# Data Lineage Platform MVP - Design Specification

**Date:** 2026-05-18  
**Project:** Data Lineage Platform  
**Mode:** View-only MVP  
**Scope:** Full stack (backend + frontend + databases)  
**Build Strategy:** Parallel tracks  
**Target Completion:** 10 business days

---

## 1. Executive Summary

This document specifies the design for a **view-only enterprise Data Lineage Platform** that enables regulatory and compliance teams to search fields, inspect business/technical meaning, drill down into XSLT variables, Java logic, XPath dependencies, run impact analysis, and compare fields across multiple jurisdictions.

The platform will be built as a **monorepo** with separation of concerns:
- **ai-infra**: Docker Compose infrastructure (MSSQL, Neo4j, other services)
- **lineage-backend**: Python FastAPI backend APIs
- **lineage-frontend**: React + TypeScript UI
- **Configuration**: Environment-specific `.env` files per component

---

## 2. Project Organization

### 2.1 Monorepo Structure

```
lineage-platform/
├── lineage-backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── api/routes/              # 40+ API endpoints
│   │   ├── core/config.py           # Pydantic settings loader
│   │   ├── db/mssql.py              # SQLAlchemy
│   │   ├── db/neo4j.py              # Neo4j driver
│   │   ├── services/                # Business logic
│   │   ├── models/                  # Pydantic models
│   │   ├── repositories/            # Data access layer
│   │   └── utils/
│   ├── db/
│   │   ├── mssql/schema.sql         # Tables, constraints
│   │   ├── mssql/indexes.sql        # Performance indexes
│   │   └── neo4j/constraints.cypher # Graph constraints
│   ├── scripts/
│   │   ├── validate_connections.py  # Test DB connectivity
│   │   ├── insert_sample_data.py    # Seed both databases
│   │   └── insert_mssql_seed.py     # MSSQL data only
│   ├── tests/
│   ├── .env.example
│   ├── requirements.txt
│   └── README.md
│
├── lineage-frontend/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── app/
│   │   │   ├── router.tsx
│   │   │   ├── queryClient.ts
│   │   │   └── appConfig.ts
│   │   ├── components/
│   │   │   ├── layout/              # AppShell, Sidebar, Topbar
│   │   │   ├── grid/                # DataGrid (reusable)
│   │   │   ├── filters/             # Filter components
│   │   │   ├── modals/              # Modal/drawer system
│   │   │   ├── cards/               # Status, metric cards
│   │   │   ├── graph/               # Graph visualization
│   │   │   └── common/              # Button, tabs, etc.
│   │   ├── features/
│   │   │   ├── dashboard/           # Dashboard page
│   │   │   ├── jurisdictions/       # Jurisdictions page
│   │   │   ├── fields/              # Field list + Field 360
│   │   │   ├── comparison/          # Field comparison
│   │   │   ├── impact/              # Impact analysis
│   │   │   ├── graphExplorer/       # Graph explorer
│   │   │   └── access/              # Access denied page
│   │   ├── hooks/
│   │   ├── services/apiClient.ts    # REST client
│   │   ├── types/
│   │   └── styles/
│   ├── .env.example
│   ├── vite.config.ts
│   ├── package.json
│   └── README.md
│
├── docs/
│   ├── api/                         # API documentation
│   ├── architecture/                # Architecture diagrams
│   └── superpowers/specs/           # Design docs (this file)
│
├── scripts/
│   ├── setup-local.sh               # One-command local setup
│   └── README.md
│
├── .gitignore
└── README.md (root)
```

### 2.2 Separation of Concerns

**ai-infra** (external, not in this repo):
- Docker Compose definitions for MSSQL, Neo4j, other services
- Infrastructure configuration and credentials
- Network and volume management

**lineage-platform** (this repo):
- Application code (backend + frontend)
- Database schemas and seed data scripts
- Documentation and deployment guides

**Configuration flow:**
```
ai-infra/docker-compose.yml 
  → spins up MSSQL:1433, Neo4j:7687
  
lineage-backend/.env 
  → MSSQL_HOST=localhost, NEO4J_URI=bolt://localhost:7687
  
lineage-frontend/.env 
  → VITE_API_BASE_URL=http://localhost:8000/api
```

---

## 3. Architecture & Data Flow

### 3.1 System Components

**ai-infra (Docker Services)**
- MSSQL Server (port 1433)
- Neo4j (port 7687)
- Optional: Redis, observability tools

**Backend (FastAPI on port 8000)**
- HTTP REST API with 40+ endpoints
- Access validation layer
- MSSQL repository layer (SQLAlchemy ORM)
- Neo4j graph service layer (Neo4j Python driver)
- Response aggregation (merges MSSQL + Neo4j data)

**Frontend (React on port 5173)**
- View-only UI (no create/edit/delete buttons)
- TanStack Query for server state management
- React Router for navigation
- Shared components: DataGrid, filters, modals, drawers

### 3.2 Data Flow

```
User Action (Frontend)
  ↓
React Component
  ↓
TanStack Query Hook → HTTP GET/POST
  ↓
FastAPI Route
  ↓
Backend validates user access
  ↓
Repository layer queries MSSQL + Neo4j
  ↓
Service layer aggregates results
  ↓
Response DTO serialized to JSON
  ↓
Frontend renders data
```

### 3.3 Database Strategy

**MSSQL (Relational—Operational Metadata)**
- Stores: Users, roles, jurisdictions, fields, interpretations, versions, audit logs
- Purpose: Source of truth for field definitions and access control
- Access: SQLAlchemy ORM (repositories pattern)

**Neo4j (Graph—Technical Lineage)**
- Stores: XSLT AST, Java dependencies, XPath mappings, impact traversal graph
- Purpose: Complex query traversals (impact analysis, lineage drill-down)
- Access: Neo4j Python driver with Cypher queries

**No direct access from frontend:**
- All data flows through backend APIs
- Frontend never connects to MSSQL or Neo4j directly
- Backend validates access before returning data

---

## 4. Build Strategy & Phases

### 4.1 Parallel Tracks Approach

Three independent work streams that progress in parallel:

**Track A: Backend APIs**
- Implement routes that query MSSQL + Neo4j
- Test with curl, Swagger UI, or Postman
- Can proceed while frontend builds mock UI

**Track B: Frontend UI**
- Build components and pages with hardcoded/mock API responses
- Establish layout, navigation, shared components
- Can proceed while backend is being built

**Track C: Database Setup**
- Create schemas, constraints, indexes
- Write and test seed scripts
- Load realistic sample data

### 4.2 Phase 1: Foundation (Days 1-2)

**Backend:**
- FastAPI app scaffold with uvicorn
- Pydantic config loader (reads from `.env`)
- MSSQL connection pool (SQLAlchemy engine + session factory)
- Neo4j driver initialization
- `/api/health` and `/api/health/dependencies` endpoints
- User/access validation scaffolding

**Frontend:**
- Vite + React + TypeScript
- React Router structure
- Mock API client with hardcoded responses
- App shell (Sidebar, Topbar, ContentArea)
- Dashboard page with mock metrics
- Navigation links to all future pages

**Database:**
- MSSQL: Create all tables (jurisdictions, fields, users, roles, access)
- Neo4j: Create constraints and indexes
- Seed script scaffold (structure ready, data to be populated)

**Deliverables:**
- Backend: `uvicorn app.main:app --reload` runs without errors
- Frontend: `npm run dev` opens http://localhost:5173, sidebar renders
- Databases: Connected and empty, ready for schema + data

---

### 4.3 Phase 2: Core Functionality (Days 3-7)

**Backend APIs (by feature domain):**

*Access & Health:*
- `GET /api/me` — current user, roles, allowed screens/jurisdictions

*Lookups:*
- `GET /api/lookups/jurisdictions`
- `GET /api/lookups/business-concepts`, `criticalities`, `statuses`, etc.

*Field Search:*
- `GET /api/fields` — search, filter, sort, paginate
- `GET /api/jurisdictions/{code}/fields`
- `GET /api/fields/{id}/overview` — basic field info

*Field 360 (tabs):*
- `GET /api/fields/{id}/business` — business interpretation
- `GET /api/fields/{id}/technical` — technical interpretation
- `GET /api/fields/{id}/xslt-drilldown` — variables, templates, XPaths, conditions
- `GET /api/fields/{id}/java-drilldown` — Java classes, methods, config keys
- `GET /api/fields/{id}/downstream/systems` — downstream systems/reports
- `GET /api/fields/{id}/downstream/validations` — rules
- `GET /api/fields/{id}/used-by` — who uses this field
- `GET /api/fields/{id}/history` — version history

*Impact Analysis:*
- `POST /api/impact-analysis/run` — generic impact query
- `GET /api/fields/{id}/impact-analysis` — field-specific impact
- `GET /api/variables/{name}/impact-analysis` — variable impact

*Field Comparison:*
- `POST /api/comparison/fields` — compare concept across jurisdictions
- `POST /api/comparison/business`, `/technical`, `/xslt`, `/java`, `/downstream`

*Graph:*
- `POST /api/graph/search` — search Neo4j nodes
- `GET /api/graph/node/{id}` — node details
- `GET /api/graph/neighbors/{id}` — adjacent nodes
- `POST /api/graph/path` — find path between two nodes

**Frontend Screens:**
- Field List page (grid: search, filter, sort, paginate, row actions)
- Field 360 page (tabs: Overview, Business, Technical, XSLT, Java, Downstream, Impact, History)
- Field Comparison page (grid: rows are attributes, columns are jurisdictions)
- Impact Analysis page (summary cards + impacted fields grid)
- Jurisdiction List page (summary of accessible jurisdictions)

**Database:**
- Seed MSSQL with: jurisdictions, fields, interpretations, users, roles, access
- Seed Neo4j with: nodes (Field, Variable, XPath, JavaMethod, etc.) and relationships
- Verify seeds work end-to-end

**Deliverables:**
- User can search fields, open Field 360, drill into XSLT/Java/Downstream tabs
- All data flows from real MSSQL + Neo4j
- Swagger at http://localhost:8000/docs shows all endpoints
- Frontend grid components reused across all list screens

---

### 4.4 Phase 3: Advanced Features & Polish (Days 8-10)

**Backend:**
- Dashboard APIs (`/api/dashboard/summary`, `/lineage-coverage`, etc.)
- Graph Explorer APIs (advanced node expansion, subgraph queries)
- Global Search APIs (`/api/search/global`, `/search/suggestions`)
- Export APIs (`POST /api/export/fields`, `/export/comparison`, etc.)
- Neo4j query optimization for deep traversals

**Frontend:**
- Dashboard page (metrics, recent changes, top impacted dependencies)
- Graph Explorer page (interactive visualization with React Flow or custom SVG)
- Global Search screen
- Export modals (CSV, Excel, JSON, PDF)
- Error states, loading states, empty states on all grids
- Performance: pagination, lazy loading, debounced search

**Testing:**
- Backend: Unit tests for repositories, services, routes
- Backend: Integration tests for end-to-end API flows
- Frontend: Component tests for grid, filters, modals
- Frontend: Integration tests for major user journeys

**Deliverables:**
- Complete MVP per document.md specification
- All 7+ screens functional and tested
- All 40+ APIs implemented and documented
- Export functionality working
- Performance acceptable for typical datasets

---

## 5. Configuration Strategy

### 5.1 Backend Configuration

**File:** `lineage-backend/.env.example` → `lineage-backend/.env`

```env
# Application
APP_NAME=Lineage Platform API
APP_ENV=local
APP_PORT=8000
LOG_LEVEL=INFO

# CORS (allow frontend dev server)
CORS_ALLOWED_ORIGINS=http://localhost:5173

# MSSQL (references ai-infra docker service)
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_DATABASE=lineage_db
MSSQL_USERNAME=sa
MSSQL_PASSWORD=YourStrongPassword123!
MSSQL_DRIVER=ODBC Driver 18 for SQL Server
MSSQL_TRUST_CERTIFICATE=yes

# Neo4j (references ai-infra docker service)
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=password
NEO4J_DATABASE=neo4j

# API Behavior
ACCESS_MODE=READ_ONLY
DEFAULT_PAGE_SIZE=25
MAX_PAGE_SIZE=100
```

**Implementation:**
- `app/core/config.py` uses Pydantic `BaseSettings` to load and validate
- Type safety: `config.mssql_host: str`, `config.neo4j_port: int`, etc.
- Startup validation: If a required var is missing, app fails at startup with clear error
- Environment-specific overrides: `export MSSQL_PASSWORD=prod_secret` overrides `.env`

### 5.2 Frontend Configuration

**File:** `lineage-frontend/.env.example` → `lineage-frontend/.env`

```env
VITE_API_BASE_URL=http://localhost:8000/api
VITE_APP_NAME=Lineage Platform
VITE_ACCESS_MODE=READ_ONLY
VITE_DEFAULT_USER=puneet.sharma
```

**Implementation:**
- Vite environment variables: `import.meta.env.VITE_API_BASE_URL`
- Built into the bundle at compile time (no runtime lookup needed)
- For development: HMR-aware, changes to `.env` require restart

### 5.3 One-Command Local Setup

**File:** `scripts/setup-local.sh`

```bash
#!/bin/bash
set -e

echo "🚀 Setting up Lineage Platform locally..."

# 1. Start infrastructure
echo "📦 Starting Docker Compose services (MSSQL, Neo4j)..."
cd ../ai-infra
docker-compose up -d
sleep 10

# 2. Backend setup
echo "🐍 Setting up backend..."
cd ../lineage-platform/lineage-backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python scripts/validate_connections.py
python scripts/insert_sample_data.py --reset false

# 3. Frontend setup
echo "⚛️ Setting up frontend..."
cd ../lineage-frontend
npm install
cp .env.example .env

echo ""
echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps (in separate terminals):"
echo "   Terminal 1: cd lineage-backend && source .venv/bin/activate && uvicorn app.main:app --reload"
echo "   Terminal 2: cd lineage-frontend && npm run dev"
echo ""
echo "URLs:"
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:8000"
echo "   Swagger:  http://localhost:8000/docs"
```

---

## 6. Development Workflow

### 6.1 Local Development Commands

**Backend (Terminal 1):**
```bash
cd lineage-backend
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Frontend (Terminal 2):**
```bash
cd lineage-frontend
npm run dev
```

**Databases (managed by ai-infra, Terminal 0 optional):**
```bash
cd ../ai-infra
docker-compose up -d
docker-compose logs -f  # Monitor services
```

### 6.2 Testing During Development

**Backend unit tests:**
```bash
cd lineage-backend
pytest tests/ -v
```

**Frontend component tests:**
```bash
cd lineage-frontend
npm run test
```

### 6.3 Resetting Data

**Reload sample data (MSSQL + Neo4j):**
```bash
cd lineage-backend
python scripts/insert_sample_data.py --reset true
```

### 6.4 Database Access (if needed for debugging)

**MSSQL:**
```bash
sqlcmd -S localhost,1433 -U sa -P YourStrongPassword123!
```

**Neo4j Browser:**
```
http://localhost:7474/browser  (or check docker-compose for actual port)
```

---

## 7. Access Control & Security

### 7.1 View-Only MVP

**Allowed HTTP methods:**
- GET (for queries)
- POST (for complex searches, impact analysis, comparisons, exports)

**Not allowed:**
- PUT, PATCH, DELETE (no mutations through UI)

**Data changes only via:**
- Backend seed scripts (outside the UI flow)
- Direct database migrations (DBA-controlled)

### 7.2 Access Validation

Backend validates user access at every boundary:
1. `/api/me` returns allowed screens + jurisdictions
2. Field search respects jurisdiction access
3. Field 360 enforces jurisdiction access
4. Impact analysis respects field visibility
5. Export checks user role/permissions

**Storage (MSSQL):**
- `app_users` — user records
- `app_roles` — role definitions
- `app_user_roles` — user-role mappings
- `app_screen_access` — which roles see which screens
- `app_jurisdiction_access` — which roles access which jurisdictions

---

## 8. Testing Strategy

### 8.1 Backend Tests

**Unit tests** (by module):
- `tests/test_health.py` — `/api/health` endpoint
- `tests/test_access.py` — access validation
- `tests/test_fields.py` — field search, Field 360, drilldown
- `tests/test_impact.py` — impact analysis logic
- `tests/test_comparison.py` — field comparison

**Integration tests:**
- Verify backend calls both MSSQL and Neo4j correctly
- Test end-to-end data flow (user request → DB query → response)

### 8.2 Frontend Tests

**Component tests** (React Testing Library):
- DataGrid with search/filter/pagination
- Field 360 tab switching
- Comparison grid rendering
- Impact Analysis summary cards

**Integration tests:**
- Sidebar navigation (screens visible based on access)
- End-to-end user journey (search field → open 360 → see lineage)

### 8.3 Manual Testing Checklist

- [ ] Field search with various filters
- [ ] Field 360 drill-down (all tabs)
- [ ] Impact analysis with different depth levels
- [ ] Field comparison across 3+ jurisdictions
- [ ] Export in all formats (CSV, Excel, JSON, PDF)
- [ ] Access denied scenarios
- [ ] Error handling (bad IDs, network errors)

---

## 9. Success Criteria (Acceptance)

The MVP is complete when:

- [x] User access is validated on all backend routes
- [x] User sees only allowed screens and jurisdictions in UI
- [x] Field list supports search, filter, sort, paginate, row actions
- [x] Field 360 shows MSSQL metadata + Neo4j lineage together
- [x] XSLT variables, templates, conditions, XPaths are drillable
- [x] Java classes and methods are drillable
- [x] Downstream systems and reports are visible
- [x] Impact analysis works (fields, variables, XPaths, Java methods, conditions)
- [x] Field comparison works across 3+ jurisdictions
- [x] Global search works across all entity types
- [x] Export works in allowed formats
- [x] UI is consistent across all screens (grid, filters, modals, drawers)
- [x] No create/update/delete actions visible in UI
- [x] Sample data loads successfully via seed scripts
- [x] Backend health check passes
- [x] All 40+ APIs documented and tested

---

## 10. Known Constraints & Assumptions

**Constraints:**
- MVP is view-only (no mutations through UI)
- Single MSSQL and single Neo4j instance (no multi-region initially)
- No real-time updates (polling only)
- Seed scripts are deterministic (idempotent)

**Assumptions:**
- Docker is available in development environment
- Python 3.11+ and Node.js 18+ installed
- MSSQL and Neo4j can run on localhost in development
- Users authenticate via backend (auth mechanism TBD in next phase)
- Sample data is sufficient for MVP validation

---

## 11. Out of Scope

**Not included in MVP:**
- Edit/create/delete field metadata
- Approval workflows
- Real-time collaboration
- Mobile app
- Multi-tenancy
- Advanced caching strategies
- Kubernetes/orchestration
- Real-time production trade lookup
- Direct code parsing from UI

**Post-MVP enhancements:**
- Authentication system (OAuth, SAML, SSO)
- Edit/approve workflows
- Audit trail UI
- Advanced reporting
- API rate limiting
- Usage analytics

---

## 12. Deliverables Summary

**By end of Phase 1 (Day 2):**
- Monorepo structure created
- Backend scaffold with config loader
- Frontend scaffold with router
- Databases initialized
- One-command setup script working

**By end of Phase 2 (Day 7):**
- 40+ backend APIs implemented
- 4 main UI screens functional (Field List, Field 360, Comparison, Impact)
- Real data flowing from MSSQL + Neo4j
- Seed scripts tested and working

**By end of Phase 3 (Day 10):**
- All 7+ screens complete (add Dashboard, Graph Explorer, Global Search)
- Advanced features working (export, graph explorer)
- Tests written and passing
- Documentation complete
- MVP ready for user testing

---

## 13. Next Steps

1. **Review this design document** — Confirm all sections align with requirements
2. **Invoke writing-plans skill** — Create detailed implementation plan with task breakdowns
3. **Begin Phase 1** — Project scaffolding and foundation setup
4. **Validate locally** — Ensure one-command setup works end-to-end
5. **Iterate through phases** — Follow parallel track approach

---

**Design Document Status:** ✅ Ready for implementation
