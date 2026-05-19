# Data Lineage Platform — Rebuild Design

**Date:** 2026-05-19  
**Status:** Approved  
**Approach:** Feature-by-feature full-stack (Approach C)

---

## 1. Decisions Made

| Decision | Choice |
|---|---|
| MSSQL schema naming | UPPERCASE table and column names |
| Frontend strategy | Full rewrite of all pages to match image references |
| DB connectivity | Real MSSQL + Neo4j via Docker (no mock fallback) |
| Auth | Skipped for now — no access validation, all APIs return data directly |
| Implementation order | Vertical slices: shared infra → feature-by-feature |

---

## 2. Architecture

```
Browser → Frontend (Vite :5173) → Backend (FastAPI :8000) → MSSQL / Neo4j
```

- Frontend and backend are independent projects under `ai-lineage/`
- Docker Compose runs MSSQL (`mcr.microsoft.com/mssql/server:2022-latest`) and Neo4j (`neo4j:5`)
- All DB access owned by backend; frontend is a pure HTTP consumer
- Read-only contract: GET for reads, POST only for search/compare/export (no mutations)

### Response envelope

All APIs return:
```json
{ "success": true, "data": {}, "message": null, "errors": [] }
```

Paginated:
```json
{
  "success": true,
  "data": {
    "items": [], "page": 1, "pageSize": 25,
    "totalItems": 100, "totalPages": 4,
    "hasNext": true, "hasPrevious": false
  }
}
```

---

## 3. Database Layer

### MSSQL

Files (replacing existing lowercase schema):
- `db/mssql/001_create_tables.sql` — all tables, UPPERCASE names
- `db/mssql/002_create_indexes.sql` — performance indexes
- `db/mssql/003_seed_access.sql` — roles and screen access
- `db/mssql/004_seed_reference_data.sql` — lookup values

Tables:
- `APP_USERS`, `APP_ROLES`, `APP_USER_ROLES`, `APP_SCREEN_ACCESS`, `APP_JURISDICTION_ACCESS`
- `JURISDICTIONS`, `REGULATORY_FIELDS`, `FIELD_INTERPRETATIONS`
- `FIELD_DOWNSTREAM_MAPPINGS`, `FIELD_VERSIONS`, `AUDIT_LOG`
- `LOOKUP_VALUES`, `SAVED_COMPARISONS`, `REGRESSION_TEST_SUGGESTIONS`

All primary keys: `BIGINT IDENTITY`. All text fields: `NVARCHAR`. Timestamps: `DATETIME2`. Booleans: `BIT`.

### Neo4j

Files:
- `db/neo4j/001_constraints.cypher` — uniqueness + existence constraints
- `db/neo4j/002_seed_graph.cypher` — sample graph data

Node labels: `BusinessConcept`, `Field`, `Jurisdiction`, `XsltFile`, `XsltTemplate`, `XsltVariable`, `XsltCondition`, `XPath`, `JavaClass`, `JavaMethod`, `DownstreamSystem`, `DownstreamReport`, `ValidationRule`, `ConfigKey`, `RegressionTest`

Key relationships: `IMPLEMENTS_CONCEPT`, `BELONGS_TO_JURISDICTION`, `PRODUCED_BY_TEMPLATE`, `PRODUCED_BY_VARIABLE`, `VARIABLE_DEPENDS_ON_VARIABLE`, `VARIABLE_READS_XPATH`, `ENRICHED_BY_METHOD`, `METHOD_CALLS_METHOD`, `FIELD_CONSUMED_BY_SYSTEM`, `FIELD_USED_IN_REPORT`

### Seed Scripts

`scripts/insert_mssql_seed.py` and `scripts/insert_neo4j_seed.py` with four named methods:

```python
def add_jurisdiction(jurisdiction_code, jurisdiction_name, region, regulator_name,
                     reporting_regime, description, owner_team, status="ACTIVE") -> int
def add_field_information(jurisdiction_code, system_name, internal_field_name,
                          business_name, external_display_name, business_translation,
                          technical_interpretation, data_type, criticality,
                          source_type, downstream: list[dict]) -> int
def add_business_concept_to_neo4j(concept_name, description) -> None
def add_field_graph_to_neo4j(field_id, jurisdiction_code, internal_field_name,
                              business_name, business_concept, xslt_file,
                              xslt_template, variables, xpaths, java_methods,
                              downstream) -> None
```

Seed coverage:
- 6 jurisdictions: JFSA, MAS, ASIC, HKMA, FINMA, OSFI
- 10 fields per jurisdiction (60 total minimum)
- `EVENT_TIMESTAMP` gets rich lineage: XSLT file `map-event-timestamp.xsl`, 5 variables, 3 conditions, 3 XPaths, 3 Java methods, 4 downstream systems

---

## 4. Backend API

**Stack:** FastAPI + SQLAlchemy Core (MSSQL) + neo4j Python driver

**Layer per feature:** Route → Service → Repository (MSSQL) or Graph Service (Neo4j)

**Pagination:** server-side, default page=1/size=25, allowed sizes 10/25/50/100

**MSSQL access:** SQLAlchemy Core with parameterized queries (no ORM, cleaner for read-only reporting)

**Neo4j access:** Parameterized Cypher in `graph/cypher_queries.py`

### API Groups

| Group | Endpoints |
|---|---|
| Health | `GET /api/health`, `GET /api/health/dependencies` |
| Lookups | `GET /api/lookups/jurisdictions`, criticalities, statuses, source-types, node-types, impact-types, downstream-systems |
| Dashboard | `GET /api/dashboard/summary`, lineage-coverage, high-risk-fields, recent-changes, top-impacted-dependencies |
| Jurisdictions | `GET /api/jurisdictions`, `GET /api/jurisdictions/{code}`, `GET /api/jurisdictions/{code}/summary`, `GET /api/jurisdictions/{code}/fields/summary` |
| Fields | `GET /api/fields` (paginated+filtered), `GET /api/fields/{id}`, `/overview`, `/business`, `/technical`, `/used-by`, `/downstream`, `/history` |
| XSLT | `GET /api/fields/{id}/xslt-drilldown`, `/xslt/templates`, `/xslt/variables`, `/xslt/conditions`, `/xslt/xpaths` |
| Java | `GET /api/fields/{id}/java-drilldown`, `/java/classes`, `/java/methods` |
| Downstream | `GET /api/fields/{id}/downstream/systems`, `/reports`, `/validations`, `/tables` |
| Impact | `GET /api/fields/{id}/impact-analysis`, `POST /api/impact-analysis/run` |
| Comparison | `POST /api/comparison/fields`, `/business`, `/technical`, `/xslt`, `/java`, `/downstream` |
| Graph | `POST /api/graph/search`, `GET /api/graph/node/{id}`, `/neighbors/{id}`, `POST /api/graph/path`, `/expand`, `/subgraph` |
| Search | `GET /api/search/global`, `GET /api/search/suggestions` |
| Export | `POST /api/export/fields`, `/field-360`, `/comparison`, `/impact-analysis` |

---

## 5. Frontend

**Stack:** React 18 + TypeScript + Vite + React Router v6 + TanStack Query + Axios + Recharts + React Flow + Lucide React

### Visual tokens (CSS variables)

```css
:root {
  --color-bg: #f6f8fb;
  --color-surface: #ffffff;
  --color-sidebar: #082044;
  --color-primary: #1267e8;
  --color-primary-soft: #e8f1ff;
  --color-border: #d8e0ea;
  --color-text: #102033;
  --color-muted: #667085;
  --color-success: #14804a;
  --color-warning: #b7791f;
  --color-danger: #d92d20;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 14px;
  --shadow-card: 0 1px 3px rgba(16, 32, 51, 0.08);
}
```

### Shared components (built first)

- **`DataGrid`** — single table used on all list pages. Toolbar: search + filter button + active filter chips + reset + export. Footer: page size selector + prev/next pagination. Columns: sortable headers + action column.
- **`FilterDrawer`** — right-side slide-in, all filter forms
- **`RightDrawer`** — generic right-side detail panel
- **`BaseModal`** — base for all modals (Detail, Export, AccessDenied)
- **`StatusBadge`**, **`RiskBadge`** — colored badge components
- **`SummaryCard`**, **`MetricCard`** — dashboard stat cards
- **`AppShell`** — layout: dark navy sidebar + topbar + main content area
- **`GridEmptyState`**, **`GridLoadingState`**, **`GridErrorState`**

### Pages — implementation order

| # | Page | Primary image refs | Route |
|---|---|---|---|
| 1 | Dashboard | 01, 04, 10 | `/` |
| 2 | Jurisdictions | 02, 03 | `/jurisdictions` |
| 3 | Fields List | 11 | `/fields` |
| 4 | Field 360 Overview | 05, 06, 12 | `/fields/:fieldId` |
| 5 | Business Interpretation | 13 | `/fields/:fieldId` (tab) |
| 6 | Technical Interpretation | 14 | `/fields/:fieldId` (tab) |
| 7 | XSLT Drilldown | 15 | `/fields/:fieldId` (tab) |
| 8 | Java Drilldown | 16 | `/fields/:fieldId` (tab) |
| 9 | Downstream Usage | 17 | `/fields/:fieldId` (tab) |
| 10 | Impact Analysis | 18 | `/impact` |
| 11 | Field Comparison | 19 | `/comparison` |
| 12 | Graph Explorer | 20 | `/graph` |
| 13 | Global Search | 21 | `/search` |
| 14 | Access Denied | — | `/access-denied` |

Field 360 (pages 4–9) is a single route with tab navigation — Overview, Business, Technical, XSLT, Java, Downstream.

### Grid rules (enforced everywhere)

- All grids use the single `DataGrid` component — no per-page table logic
- All filters use `FilterDrawer`
- Search is always a controlled input with debounce
- Pagination is always server-side
- Default page size: 25

---

## 6. Implementation Sequence

1. **DB schema** — write UPPERCASE MSSQL DDL + Neo4j constraints
2. **Docker Compose** — verify MSSQL + Neo4j services
3. **Seed scripts** — implement all four named methods + seed 6 jurisdictions × 10 fields
4. **Backend infrastructure** — config, DB clients, response envelope, error handlers
5. **Shared frontend components** — CSS variables, AppShell, DataGrid, FilterDrawer, RightDrawer, badges, cards
6. **Dashboard** — backend summary APIs + frontend page (stat cards + charts)
7. **Jurisdictions** — backend list/detail APIs + frontend list page (table + cards view)
8. **Fields List** — backend paginated fields API + frontend DataGrid page
9. **Field 360** — backend field detail + interpretation + downstream APIs + frontend tabbed page
10. **XSLT / Java / Downstream** — backend lineage APIs (Neo4j) + frontend drilldown tabs
11. **Impact Analysis** — backend impact graph service + frontend page
12. **Field Comparison** — backend comparison POST APIs + frontend selector + diff grid
13. **Graph Explorer** — backend graph search/expand APIs + React Flow canvas
14. **Global Search** — backend search API + frontend results page
15. **Access Denied page** — static frontend page

---

## 7. Acceptance Criteria

1. Frontend starts (`npm run dev` in `lineage-frontend/`)
2. Backend starts (`uvicorn app.main:app --reload` in `lineage-backend/`)
3. MSSQL DDL scripts exist with UPPERCASE table and column names
4. Neo4j constraint and seed scripts exist
5. Seed scripts contain all four named methods
6. 6 jurisdictions × 10 fields minimum seeded
7. `EVENT_TIMESTAMP` has rich XSLT/Java/XPath/condition/downstream lineage
8. All 14 pages render real data from backend APIs
9. Dashboard, Jurisdictions, Fields, Field 360, Comparison, Impact, Graph Explorer, Search all functional
10. All list pages use the single reusable `DataGrid` component
11. No mutation APIs exposed (no PUT/PATCH/DELETE)
12. UI visually matches image references (`images/` folder)
