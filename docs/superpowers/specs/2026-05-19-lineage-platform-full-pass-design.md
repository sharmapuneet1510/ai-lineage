# Lineage Platform — Full Pass Design

**Date:** 2026-05-19  
**Approach:** C — Schema-aligned rebuild with surgical frontend fixes  
**Scope:** Data layer → Backend → Frontend

---

## 1. Goals

Complete all 23 acceptance criteria from the original spec. The project structure, Python service layer, and React component architecture already exist and are sound. This pass focuses on:

1. Replacing the partial MSSQL schema (8 lowercase tables, 3 jurisdictions, 8 fields) with the full spec-compliant schema.
2. Expanding Neo4j from 24 sparse nodes to a full lineage graph with all required node types.
3. Fixing backend connection bugs and wiring real queries into stub routes.
4. Fixing 6 frontend pages to match the reference images.

---

## 2. Data Layer

### 2.1 MSSQL — Schema Recreate

**Action:** Drop existing 8 tables, recreate with spec-compliant DDL.

**Tables (13 total, all uppercase names, all uppercase column names):**

| Table | Purpose |
|---|---|
| `APP_USERS` | Platform users (puneet.sharma + others) |
| `APP_ROLES` | Role definitions (ADMIN, VIEWER, ANALYST) |
| `APP_USER_ROLES` | User ↔ Role mapping |
| `APP_SCREEN_ACCESS` | Which roles can access which screens |
| `APP_JURISDICTION_ACCESS` | Which roles can access which jurisdictions |
| `JURISDICTIONS` | 6 jurisdictions (JFSA, MAS, ASIC, HKMA, FINMA, OSFI) |
| `REGULATORY_FIELDS` | 60 fields (10 per jurisdiction) |
| `FIELD_INTERPRETATIONS` | Business + technical interpretation per field |
| `FIELD_DOWNSTREAM_MAPPINGS` | Downstream system mappings per field |
| `FIELD_VERSIONS` | Snapshot history per field |
| `AUDIT_LOG` | User action audit trail |
| `LOOKUP_VALUES` | Reference data (criticalities, statuses, source types) |
| `SAVED_COMPARISONS` | Persisted comparison results |

**Key column requirements:**
- All PKs: `BIGINT IDENTITY`
- Business text: `NVARCHAR(MAX)` or `NVARCHAR(255)`
- Timestamps: `DATETIME2`
- Booleans: `BIT`
- All names: uppercase

**`REGULATORY_FIELDS` full column set** (adds missing columns vs old schema):
```
FIELD_ID, JURISDICTION_ID, SYSTEM_NAME, INTERNAL_FIELD_NAME, BUSINESS_NAME,
EXTERNAL_DISPLAY_NAME, DATA_TYPE, FIELD_CATEGORY, REPORTING_SECTION,
IS_MANDATORY, CRITICALITY, SOURCE_TYPE, OWNER_TEAM, STATUS,
DESCRIPTION, CREATED_AT, UPDATED_AT
```

**`FIELD_INTERPRETATIONS` full column set:**
```
INTERPRETATION_ID, FIELD_ID, BUSINESS_TRANSLATION, BUSINESS_INTERPRETATION,
TECHNICAL_INTERPRETATION, EXAMPLE_SCENARIO, ASSUMPTIONS, STATUS,
CREATED_AT, UPDATED_AT
```

### 2.2 Seed Data

**Jurisdictions (6):** JFSA, MAS, ASIC, HKMA, FINMA, OSFI

**Fields per jurisdiction (10):**
EVENT_TIMESTAMP, REPORTING_ACTION, VALUATION_TIMESTAMP, CLEARING_STATUS,
PRODUCT_CLASS, TRADE_ID, COUNTERPARTY_ID, ASSET_CLASS, EVENT_TYPE, NOTIONAL_AMOUNT

**Rich lineage for EVENT_TIMESTAMP (JFSA):**
- XSLT file: `map-event-timestamp.xsl`
- Template: `map-event-timestamp`
- Variables: `v_event_timestamp`, `v_asset_class`, `v_event_type`, `v_rates_event_timestamp`, `v_equity_event_timestamp`
- Conditions: 3 (assetClass=Rates/New, assetClass=Equity/New, eventType=Correction/Cancel)
- XPaths: `/trade/rates/eventTimestamp`, `/trade/equity/eventTimestamp`, `/trade/common/eventTime`
- Java methods: `EventTimestampMapper.mapEventTimestamp`, `RatesEventProcessor.getEventTimestamp`, `EquityEventProcessor.getEventTimestamp`
- Downstream: DTCC GTR Gateway, Regulatory Data Warehouse, ACK/NACK Reconciliation, Exception Dashboard

**Access seed:**
- User `puneet.sharma` → role `ADMIN` → access to all 6 jurisdictions and all screens

### 2.3 Neo4j — Full Graph Rebuild

**New node labels (11 added to existing 4):**
`BusinessConcept`, `Jurisdiction`, `XsltFile`, `XsltTemplate`, `XsltCondition`,
`DownstreamSystem`, `DownstreamReport`, `ValidationRule`, `ConfigKey`, `RegressionTest`, `JavaClass`

**Relationships (24 types per spec):**
All EVENT_TIMESTAMP lineage edges created: XSLT file → template → variables → conditions → xpaths, Java class → method chains, field → downstream systems.

**Other fields:** Minimal graph (field node + 1 downstream system) to satisfy the graph explorer.

---

## 3. Backend

### 3.1 Connection Bug Fix

`app/db/mssql.py` — `check_mssql_connection()`:
```python
# Before (broken)
conn.execute("SELECT 1")
# After (fixed)
conn.execute(text("SELECT 1"))
```

### 3.2 Repository Updates

**Existing repos** — update all SQL strings from lowercase to uppercase table names:
- `field_repository.py` — `regulatory_fields` → `REGULATORY_FIELDS`, etc.
- `access_repository.py` — table rename (`users` → `APP_USERS`) plus column renames (`username` → `USERNAME`, `status` → `STATUS`, etc.) to match uppercase DDL

**New repositories:**
- `dashboard_repository.py` — 5 queries: summary stats, lineage coverage by jurisdiction, high-risk fields, recent changes, top downstream systems
- `jurisdiction_repository.py` — list all, get by code, get with field summary
- `interpretation_repository.py` — fetch structured business/technical interpretation by field_id
- `lookup_repository.py` — fetch lookup values by category

### 3.3 Route Stubs → Real Implementations

| Route file | Endpoints to implement |
|---|---|
| `dashboard_routes.py` | `GET /dashboard/summary`, `/lineage-coverage`, `/high-risk-fields`, `/recent-changes`, `/top-impacted-dependencies` |
| `jurisdiction_routes.py` | `GET /jurisdictions`, `/jurisdictions/{code}`, `/jurisdictions/{code}/summary` |
| `comparison_routes.py` | `POST /comparison/fields` — cross-jurisdiction attribute diff |
| `impact_routes.py` | `GET /fields/{id}/impact-analysis`, `POST /impact-analysis/run` |
| `search_routes.py` | `GET /search/global` — searches MSSQL fields + Neo4j nodes |
| `lineage_routes.py` | `GET /fields/{id}/xslt-drilldown`, `/fields/{id}/java-drilldown` — Neo4j queries |

### 3.4 Access Control

Header `X-User-Name: puneet.sharma` resolved via `APP_USERS → APP_USER_ROLES → APP_JURISDICTION_ACCESS`. All data routes validate access before returning results. No mutation routes added.

---

## 4. Frontend

Six targeted page fixes. No new pages, no changes to shared components, CSS variables, or routing.

### 4.1 Dashboard (`DashboardPage.tsx`)

Add below existing stat cards:
- **Lineage Coverage by Jurisdiction** — horizontal bar chart (pure CSS flex, no lib) — data from `GET /dashboard/lineage-coverage`
- **Recent Changes** — table (field name, jurisdiction, changed-on, changed-by) — data from `GET /dashboard/recent-changes`
- **High Risk Fields** — table (name, jurisdiction, criticality badge) — data from `GET /dashboard/high-risk-fields`

### 4.2 Fields List (`FieldListPage.tsx`)

Add two filter selects: `Criticality` (All/HIGH/MEDIUM/LOW) and `Status` (All/APPROVED/PENDING/DEPRECATED). Pass as query params to existing paginated API.

### 4.3 Field 360 (`Field360Page.tsx`)

**Layout change:** Two-column layout matching reference image 12.
- Left column: Field metadata card (internal name, jurisdiction, data type, category, mandatory, owner, steward)
- Right column: Description section + Technical Summary section + "Lineage At A Glance" counts row (XSLT Templates, XSL Variables, Conditions, XPaths, Java Classes, Java Methods) — counts sourced from `GET /fields/{id}/overview` which returns aggregated Neo4j node counts per type

**Tab changes:**
- Add `Lineage` tab — moves the existing lineage graph here
- Add `History` tab — reads `FIELD_VERSIONS` via `GET /fields/{id}/history`
- Add `Audit` tab — reads `AUDIT_LOG` via `GET /fields/{id}/audit`
- Tabs order: Overview · Business · Technical · Lineage · Downstream · History · Audit

### 4.4 Business Interpretation Tab (within Field360Page)

Replace plain text block with structured layout:
- **Left panel:** Definition, Business Context, Business Rules (bulleted), Notes
- **Right panel:** Related Business Concepts (from Neo4j `BusinessConcept` nodes)

Data from `GET /fields/{id}/business`.

### 4.5 XSLT Drill-Down Tab (within Field360Page)

Replace flat variable list with a two-panel layout:
- **Left panel:** Tree — XsltFile → XsltTemplate → XsltVariable items → XsltCondition items → XPath items. Each node is clickable.
- **Right panel:** Detail panel for selected node (name, type, defined-in file, used-by list)

Data from `GET /fields/{id}/xslt-drilldown` (Neo4j).

### 4.6 Field Comparison (`FieldComparisonPage.tsx`)

Restructure to match reference image 19:
- Field picker dropdown (e.g. "Event Timestamp") + jurisdiction checkboxes (JFSA / MAS / ASIC / HKMA)
- `Compare` button triggers `POST /comparison/fields`
- Result: tab bar (Business · Technical · XSLT · Java · Downstream · Impact) each showing an attribute comparison table with jurisdiction columns

---

## 5. Constraints

- View-only: no PUT/PATCH/DELETE routes added
- No new npm packages added (chart is CSS-based)
- No new Python packages added
- Seed scripts are re-runnable (upsert pattern, no duplicates)
- All frontend data comes from backend APIs; no hardcoded business data

---

## 6. Acceptance Criteria Checklist

| # | Criterion | Action |
|---|---|---|
| 1 | Frontend starts | Already passing |
| 2 | Backend starts | Fix connection bug |
| 3 | MSSQL DDL uppercase | Recreate schema |
| 4 | Neo4j scripts | Extend seed |
| 5 | Python insert methods | Already exist; update for new schema |
| 6 | 6 jurisdictions | Add HKMA, FINMA, OSFI |
| 7 | 10 fields per jurisdiction | Seed 60 fields |
| 8 | EVENT_TIMESTAMP rich lineage | Full XSLT + Java + XPath + Neo4j |
| 9 | Dashboard from backend | Wire dashboard routes |
| 10 | Jurisdictions from backend | Wire jurisdiction routes |
| 11 | Fields list from backend | Already working; update table names |
| 12 | Field 360 from backend + Neo4j | Restructure page + wire lineage routes |
| 13 | Comparison from backend + Neo4j | Wire comparison route |
| 14 | Impact analysis | Wire impact route |
| 15 | Graph explorer from Neo4j | Already working; enrich graph data |
| 16 | Global search | Wire search route |
| 17 | Reusable DataGrid | Already exists |
| 18 | Consistent search/filter/pagination | Already exists |
| 19 | View-only enforced | Access control layer in place |
| 20 | No mutation APIs | No new mutation routes |
| 21 | Docs under docs/ | Already exist |
| 22 | README explains how to run | Already exists |
| 23 | UI matches reference images | 6 page fixes above |
