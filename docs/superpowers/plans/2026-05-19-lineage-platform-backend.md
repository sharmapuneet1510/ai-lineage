# Lineage Platform — Backend & Database Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the full backend — UPPERCASE MSSQL schema, Neo4j graph, Python seed scripts (with four named methods), and all FastAPI routes serving real data.

**Architecture:** FastAPI → SQLAlchemy Core (MSSQL, read-only queries) + neo4j Python driver (Neo4j). No ORM. All tables UPPERCASE. No auth — all endpoints open for PoC.

**Tech Stack:** Python 3.11, FastAPI, SQLAlchemy Core, pyodbc, neo4j driver, Docker Compose (MSSQL 2022 + Neo4j 5)

---

## File Map

**DB scripts (replace existing lowercase files):**
- `lineage-backend/db/mssql/001_create_tables.sql`
- `lineage-backend/db/mssql/002_create_indexes.sql`
- `lineage-backend/db/mssql/003_seed_access.sql`
- `lineage-backend/db/mssql/004_seed_reference_data.sql`
- `lineage-backend/db/neo4j/001_constraints.cypher`
- `lineage-backend/db/neo4j/002_seed_graph.cypher`

**Seed scripts:**
- `lineage-backend/scripts/insert_mssql_seed.py` — four named methods + full 6×10 data
- `lineage-backend/scripts/insert_neo4j_seed.py` — graph nodes + relationships
- `lineage-backend/scripts/insert_sample_data.py` — orchestrator
- `lineage-backend/scripts/validate_connections.py`

**Backend core:**
- `lineage-backend/app/core/config.py`
- `lineage-backend/app/db/mssql.py`
- `lineage-backend/app/db/neo4j.py`
- `lineage-backend/app/db/__init__.py`
- `lineage-backend/app/core/response.py`
- `lineage-backend/app/utils/pagination.py`

**Repositories (MSSQL queries):**
- `lineage-backend/app/repositories/lookup_repository.py`
- `lineage-backend/app/repositories/dashboard_repository.py`
- `lineage-backend/app/repositories/jurisdiction_repository.py`
- `lineage-backend/app/repositories/field_repository.py`
- `lineage-backend/app/repositories/interpretation_repository.py`

**Graph services (Neo4j queries):**
- `lineage-backend/app/graph/cypher_queries.py`
- `lineage-backend/app/graph/lineage_graph_service.py`
- `lineage-backend/app/graph/impact_graph_service.py`
- `lineage-backend/app/graph/comparison_graph_service.py`
- `lineage-backend/app/graph/graph_search_service.py`

**Services:**
- `lineage-backend/app/services/lookup_service.py`
- `lineage-backend/app/services/dashboard_service.py`
- `lineage-backend/app/services/jurisdiction_service.py`
- `lineage-backend/app/services/field_service.py`
- `lineage-backend/app/services/lineage_service.py`
- `lineage-backend/app/services/impact_service.py`
- `lineage-backend/app/services/comparison_service.py`
- `lineage-backend/app/services/graph_service.py`
- `lineage-backend/app/services/search_service.py`
- `lineage-backend/app/services/export_service.py`

**Routes (rewrite stubs with real logic):**
- `lineage-backend/app/api/routes/health_routes.py`
- `lineage-backend/app/api/routes/lookup_routes.py`
- `lineage-backend/app/api/routes/dashboard_routes.py`
- `lineage-backend/app/api/routes/jurisdiction_routes.py`
- `lineage-backend/app/api/routes/field_routes.py`
- `lineage-backend/app/api/routes/lineage_routes.py`
- `lineage-backend/app/api/routes/impact_routes.py`
- `lineage-backend/app/api/routes/comparison_routes.py`
- `lineage-backend/app/api/routes/graph_routes.py`
- `lineage-backend/app/api/routes/search_routes.py`
- `lineage-backend/app/api/routes/export_routes.py`

**Models:**
- `lineage-backend/app/models/common.py`
- `lineage-backend/app/models/dashboard_models.py`
- `lineage-backend/app/models/jurisdiction_models.py`
- `lineage-backend/app/models/field_models.py`
- `lineage-backend/app/models/lineage_models.py`
- `lineage-backend/app/models/comparison_models.py`
- `lineage-backend/app/models/impact_models.py`
- `lineage-backend/app/models/graph_models.py`
- `lineage-backend/app/models/search_models.py`
- `lineage-backend/app/models/lookup_models.py`

---

## Task 1: Docker Compose + MSSQL DDL

**Files:**
- Modify: `docker-compose.yml`
- Create: `lineage-backend/db/mssql/001_create_tables.sql`
- Create: `lineage-backend/db/mssql/002_create_indexes.sql`

- [ ] **Step 1: Update docker-compose.yml**

```yaml
version: "3.9"
services:
  mssql:
    image: mcr.microsoft.com/mssql/server:2022-latest
    environment:
      ACCEPT_EULA: "Y"
      SA_PASSWORD: "Lineage@2024"
      MSSQL_PID: Developer
    ports:
      - "1433:1433"
    volumes:
      - mssql_data:/var/opt/mssql
    healthcheck:
      test: /opt/mssql-tools18/bin/sqlcmd -S localhost -U sa -P "Lineage@2024" -C -Q "SELECT 1" || exit 1
      interval: 10s
      retries: 10
      start_period: 30s

  neo4j:
    image: neo4j:5
    environment:
      NEO4J_AUTH: neo4j/lineage2024
      NEO4J_PLUGINS: '["apoc"]'
    ports:
      - "7474:7474"
      - "7687:7687"
    volumes:
      - neo4j_data:/data

volumes:
  mssql_data:
  neo4j_data:
```

- [ ] **Step 2: Create 001_create_tables.sql**

```sql
-- Run: sqlcmd -S localhost -U sa -P "Lineage@2024" -C -Q "CREATE DATABASE LINEAGE_DB" (first time only)
-- Then: sqlcmd -S localhost -U sa -P "Lineage@2024" -C -d LINEAGE_DB -i 001_create_tables.sql

USE LINEAGE_DB;
GO

IF OBJECT_ID('REGRESSION_TEST_SUGGESTIONS','U') IS NOT NULL DROP TABLE REGRESSION_TEST_SUGGESTIONS;
IF OBJECT_ID('SAVED_COMPARISONS','U') IS NOT NULL DROP TABLE SAVED_COMPARISONS;
IF OBJECT_ID('AUDIT_LOG','U') IS NOT NULL DROP TABLE AUDIT_LOG;
IF OBJECT_ID('FIELD_VERSIONS','U') IS NOT NULL DROP TABLE FIELD_VERSIONS;
IF OBJECT_ID('FIELD_DOWNSTREAM_MAPPINGS','U') IS NOT NULL DROP TABLE FIELD_DOWNSTREAM_MAPPINGS;
IF OBJECT_ID('FIELD_INTERPRETATIONS','U') IS NOT NULL DROP TABLE FIELD_INTERPRETATIONS;
IF OBJECT_ID('REGULATORY_FIELDS','U') IS NOT NULL DROP TABLE REGULATORY_FIELDS;
IF OBJECT_ID('LOOKUP_VALUES','U') IS NOT NULL DROP TABLE LOOKUP_VALUES;
IF OBJECT_ID('APP_JURISDICTION_ACCESS','U') IS NOT NULL DROP TABLE APP_JURISDICTION_ACCESS;
IF OBJECT_ID('APP_SCREEN_ACCESS','U') IS NOT NULL DROP TABLE APP_SCREEN_ACCESS;
IF OBJECT_ID('APP_USER_ROLES','U') IS NOT NULL DROP TABLE APP_USER_ROLES;
IF OBJECT_ID('APP_ROLES','U') IS NOT NULL DROP TABLE APP_ROLES;
IF OBJECT_ID('APP_USERS','U') IS NOT NULL DROP TABLE APP_USERS;
IF OBJECT_ID('JURISDICTIONS','U') IS NOT NULL DROP TABLE JURISDICTIONS;
GO

CREATE TABLE APP_USERS (
  USER_ID      BIGINT IDENTITY(1,1) PRIMARY KEY,
  USERNAME     NVARCHAR(100) NOT NULL,
  DISPLAY_NAME NVARCHAR(255) NOT NULL,
  EMAIL        NVARCHAR(255),
  STATUS       NVARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
  CREATED_AT   DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
  UPDATED_AT   DATETIME2     NULL,
  CONSTRAINT UQ_APP_USERS_USERNAME UNIQUE (USERNAME)
);

CREATE TABLE APP_ROLES (
  ROLE_ID     BIGINT IDENTITY(1,1) PRIMARY KEY,
  ROLE_NAME   NVARCHAR(100) NOT NULL,
  DESCRIPTION NVARCHAR(MAX),
  CONSTRAINT UQ_APP_ROLES_NAME UNIQUE (ROLE_NAME)
);

CREATE TABLE APP_USER_ROLES (
  USER_ID BIGINT NOT NULL,
  ROLE_ID BIGINT NOT NULL,
  CONSTRAINT PK_APP_USER_ROLES PRIMARY KEY (USER_ID, ROLE_ID),
  CONSTRAINT FK_AUR_USER FOREIGN KEY (USER_ID) REFERENCES APP_USERS(USER_ID),
  CONSTRAINT FK_AUR_ROLE FOREIGN KEY (ROLE_ID) REFERENCES APP_ROLES(ROLE_ID)
);

CREATE TABLE APP_SCREEN_ACCESS (
  SCREEN_ACCESS_ID BIGINT IDENTITY(1,1) PRIMARY KEY,
  ROLE_ID          BIGINT        NOT NULL,
  SCREEN_CODE      NVARCHAR(100) NOT NULL,
  CAN_VIEW         BIT           NOT NULL DEFAULT 1,
  CONSTRAINT FK_ASA_ROLE        FOREIGN KEY (ROLE_ID) REFERENCES APP_ROLES(ROLE_ID),
  CONSTRAINT UQ_ASA_ROLE_SCREEN UNIQUE (ROLE_ID, SCREEN_CODE)
);

CREATE TABLE APP_JURISDICTION_ACCESS (
  JURISDICTION_ACCESS_ID BIGINT IDENTITY(1,1) PRIMARY KEY,
  ROLE_ID                BIGINT        NOT NULL,
  JURISDICTION_CODE      NVARCHAR(50)  NOT NULL,
  CAN_VIEW               BIT           NOT NULL DEFAULT 1,
  CONSTRAINT FK_AJA_ROLE       FOREIGN KEY (ROLE_ID) REFERENCES APP_ROLES(ROLE_ID),
  CONSTRAINT UQ_AJA_ROLE_JCODE UNIQUE (ROLE_ID, JURISDICTION_CODE)
);

CREATE TABLE JURISDICTIONS (
  JURISDICTION_ID   BIGINT IDENTITY(1,1) PRIMARY KEY,
  JURISDICTION_CODE NVARCHAR(50)  NOT NULL,
  JURISDICTION_NAME NVARCHAR(255) NOT NULL,
  REGION            NVARCHAR(100),
  REGULATOR_NAME    NVARCHAR(255),
  REPORTING_REGIME  NVARCHAR(255),
  DESCRIPTION       NVARCHAR(MAX),
  OWNER_TEAM        NVARCHAR(255),
  STATUS            NVARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
  CREATED_AT        DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
  UPDATED_AT        DATETIME2     NULL,
  CONSTRAINT UQ_JURISDICTIONS_CODE UNIQUE (JURISDICTION_CODE)
);

CREATE TABLE REGULATORY_FIELDS (
  FIELD_ID              BIGINT IDENTITY(1,1) PRIMARY KEY,
  JURISDICTION_ID       BIGINT        NOT NULL,
  SYSTEM_NAME           NVARCHAR(255) NOT NULL,
  INTERNAL_FIELD_NAME   NVARCHAR(255) NOT NULL,
  BUSINESS_NAME         NVARCHAR(255) NOT NULL,
  EXTERNAL_DISPLAY_NAME NVARCHAR(255),
  DATA_TYPE             NVARCHAR(100),
  FIELD_CATEGORY        NVARCHAR(255),
  REPORTING_SECTION     NVARCHAR(255),
  IS_MANDATORY          BIT           NOT NULL DEFAULT 0,
  CRITICALITY           NVARCHAR(50)  NOT NULL DEFAULT 'MEDIUM',
  SOURCE_TYPE           NVARCHAR(100),
  OWNER_TEAM            NVARCHAR(255),
  STATUS                NVARCHAR(50)  NOT NULL DEFAULT 'ACTIVE',
  DESCRIPTION           NVARCHAR(MAX),
  CREATED_AT            DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
  UPDATED_AT            DATETIME2     NULL,
  CONSTRAINT FK_RF_JURISDICTION  FOREIGN KEY (JURISDICTION_ID) REFERENCES JURISDICTIONS(JURISDICTION_ID),
  CONSTRAINT UQ_RF_JCODE_FNAME   UNIQUE (JURISDICTION_ID, INTERNAL_FIELD_NAME)
);

CREATE TABLE FIELD_INTERPRETATIONS (
  INTERPRETATION_ID    BIGINT IDENTITY(1,1) PRIMARY KEY,
  FIELD_ID             BIGINT    NOT NULL,
  BUSINESS_TRANSLATION NVARCHAR(MAX),
  BUSINESS_INTERPRETATION NVARCHAR(MAX),
  TECHNICAL_INTERPRETATION NVARCHAR(MAX),
  EXAMPLE_SCENARIO     NVARCHAR(MAX),
  ASSUMPTIONS          NVARCHAR(MAX),
  STATUS               NVARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  CREATED_AT           DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME(),
  UPDATED_AT           DATETIME2    NULL,
  CONSTRAINT FK_FI_FIELD FOREIGN KEY (FIELD_ID) REFERENCES REGULATORY_FIELDS(FIELD_ID)
);

CREATE TABLE FIELD_DOWNSTREAM_MAPPINGS (
  DOWNSTREAM_MAPPING_ID  BIGINT IDENTITY(1,1) PRIMARY KEY,
  FIELD_ID               BIGINT         NOT NULL,
  DOWNSTREAM_NAME        NVARCHAR(255)  NOT NULL,
  DOWNSTREAM_TYPE        NVARCHAR(100),
  DOWNSTREAM_PATH_OR_FIELD NVARCHAR(1000),
  USAGE_TYPE             NVARCHAR(100),
  CRITICALITY            NVARCHAR(50),
  DESCRIPTION            NVARCHAR(MAX),
  CREATED_AT             DATETIME2      NOT NULL DEFAULT SYSUTCDATETIME(),
  UPDATED_AT             DATETIME2      NULL,
  CONSTRAINT FK_FDM_FIELD FOREIGN KEY (FIELD_ID) REFERENCES REGULATORY_FIELDS(FIELD_ID)
);

CREATE TABLE FIELD_VERSIONS (
  VERSION_ID   BIGINT IDENTITY(1,1) PRIMARY KEY,
  FIELD_ID     BIGINT       NOT NULL,
  VERSION_NO   INT          NOT NULL,
  SNAPSHOT_JSON NVARCHAR(MAX),
  CHANGE_REASON NVARCHAR(MAX),
  CHANGED_BY   NVARCHAR(100),
  CHANGED_AT   DATETIME2    NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_FV_FIELD    FOREIGN KEY (FIELD_ID) REFERENCES REGULATORY_FIELDS(FIELD_ID),
  CONSTRAINT UQ_FV_FIELD_VNO UNIQUE (FIELD_ID, VERSION_NO)
);

CREATE TABLE AUDIT_LOG (
  AUDIT_ID     BIGINT IDENTITY(1,1) PRIMARY KEY,
  ENTITY_TYPE  NVARCHAR(100) NOT NULL,
  ENTITY_ID    BIGINT,
  ACTION_TYPE  NVARCHAR(100) NOT NULL,
  OLD_VALUE    NVARCHAR(MAX),
  NEW_VALUE    NVARCHAR(MAX),
  PERFORMED_BY NVARCHAR(100) NOT NULL,
  PERFORMED_AT DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
  REMARKS      NVARCHAR(MAX)
);

CREATE TABLE LOOKUP_VALUES (
  LOOKUP_ID     BIGINT IDENTITY(1,1) PRIMARY KEY,
  LOOKUP_TYPE   NVARCHAR(100) NOT NULL,
  LOOKUP_CODE   NVARCHAR(100) NOT NULL,
  LOOKUP_LABEL  NVARCHAR(255) NOT NULL,
  DISPLAY_ORDER INT,
  IS_ACTIVE     BIT           NOT NULL DEFAULT 1,
  CONSTRAINT UQ_LV_TYPE_CODE UNIQUE (LOOKUP_TYPE, LOOKUP_CODE)
);

CREATE TABLE SAVED_COMPARISONS (
  COMPARISON_ID   BIGINT IDENTITY(1,1) PRIMARY KEY,
  COMPARISON_NAME NVARCHAR(255) NOT NULL,
  COMPARISON_TYPE NVARCHAR(100) NOT NULL,
  FIELD_IDS       NVARCHAR(MAX) NOT NULL,
  CREATED_BY      NVARCHAR(100) NOT NULL,
  CREATED_AT      DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);

CREATE TABLE REGRESSION_TEST_SUGGESTIONS (
  SUGGESTION_ID    BIGINT IDENTITY(1,1) PRIMARY KEY,
  FIELD_ID         BIGINT        NOT NULL,
  TEST_NAME        NVARCHAR(255) NOT NULL,
  TEST_DESCRIPTION NVARCHAR(MAX),
  TEST_TYPE        NVARCHAR(100),
  PRIORITY         NVARCHAR(50),
  CREATED_AT       DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_RTS_FIELD FOREIGN KEY (FIELD_ID) REFERENCES REGULATORY_FIELDS(FIELD_ID)
);
GO
```

- [ ] **Step 3: Create 002_create_indexes.sql**

```sql
USE LINEAGE_DB;
GO
CREATE INDEX IX_RF_JURISDICTION_ID    ON REGULATORY_FIELDS(JURISDICTION_ID);
CREATE INDEX IX_RF_SYSTEM_NAME        ON REGULATORY_FIELDS(SYSTEM_NAME);
CREATE INDEX IX_RF_INTERNAL_NAME      ON REGULATORY_FIELDS(INTERNAL_FIELD_NAME);
CREATE INDEX IX_RF_BUSINESS_NAME      ON REGULATORY_FIELDS(BUSINESS_NAME);
CREATE INDEX IX_RF_CRITICALITY        ON REGULATORY_FIELDS(CRITICALITY);
CREATE INDEX IX_RF_STATUS             ON REGULATORY_FIELDS(STATUS);
CREATE INDEX IX_FDM_FIELD_ID          ON FIELD_DOWNSTREAM_MAPPINGS(FIELD_ID);
CREATE INDEX IX_AL_ENTITY             ON AUDIT_LOG(ENTITY_TYPE, ENTITY_ID);
CREATE INDEX IX_ASA_ROLE_SCREEN       ON APP_SCREEN_ACCESS(ROLE_ID, SCREEN_CODE);
CREATE INDEX IX_AJA_ROLE_JCODE        ON APP_JURISDICTION_ACCESS(ROLE_ID, JURISDICTION_CODE);
GO
```

- [ ] **Step 4: Start Docker and apply schema**

```bash
cd /Users/puneetsharma/Workspace/projects/ai-lab/ai-lineage
docker compose up -d
# Wait ~30s for MSSQL to be ready, then:
docker exec -it ai-lineage-mssql-1 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "Lineage@2024" -C \
  -Q "IF DB_ID('LINEAGE_DB') IS NULL CREATE DATABASE LINEAGE_DB"
docker exec -i ai-lineage-mssql-1 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "Lineage@2024" -C -d LINEAGE_DB \
  -i /dev/stdin < lineage-backend/db/mssql/001_create_tables.sql
docker exec -i ai-lineage-mssql-1 /opt/mssql-tools18/bin/sqlcmd \
  -S localhost -U sa -P "Lineage@2024" -C -d LINEAGE_DB \
  -i /dev/stdin < lineage-backend/db/mssql/002_create_indexes.sql
```

Expected: No errors, all tables created.

- [ ] **Step 5: Commit**

```bash
git add docker-compose.yml lineage-backend/db/mssql/
git commit -m "feat: UPPERCASE MSSQL schema — 001_create_tables + 002_create_indexes"
```

---

## Task 2: Neo4j Constraints + Seed Graph

**Files:**
- Create: `lineage-backend/db/neo4j/001_constraints.cypher`
- Create: `lineage-backend/db/neo4j/002_seed_graph.cypher`

- [ ] **Step 1: Write 001_constraints.cypher**

```cypher
CREATE CONSTRAINT IF NOT EXISTS FOR (n:BusinessConcept)  REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Field)             REQUIRE n.fieldId IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:Jurisdiction)      REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:XsltFile)          REQUIRE n.path IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:XsltTemplate)      REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:XsltVariable)      REQUIRE n.name IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:XPath)             REQUIRE n.expression IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:JavaClass)         REQUIRE n.qualifiedName IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:JavaMethod)        REQUIRE n.qualifiedName IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:DownstreamSystem)  REQUIRE n.code IS UNIQUE;
CREATE CONSTRAINT IF NOT EXISTS FOR (n:ValidationRule)    REQUIRE n.name IS UNIQUE;
```

- [ ] **Step 2: Apply constraints**

```bash
docker exec -i ai-lineage-neo4j-1 cypher-shell \
  -u neo4j -p lineage2024 \
  --file /dev/stdin < lineage-backend/db/neo4j/001_constraints.cypher
```

Expected: `0 rows available after 11 ms`

- [ ] **Step 3: Commit**

```bash
git add lineage-backend/db/neo4j/001_constraints.cypher
git commit -m "feat: Neo4j uniqueness constraints for all node labels"
```

---

## Task 3: MSSQL Seed Script (Four Named Methods)

**Files:**
- Create: `lineage-backend/scripts/insert_mssql_seed.py`

- [ ] **Step 1: Write insert_mssql_seed.py**

```python
#!/usr/bin/env python3
"""
MSSQL seed script. Run from lineage-backend/:
  python scripts/insert_mssql_seed.py [--dry-run]
"""
import os, sys, json, argparse
from datetime import datetime
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import pyodbc
from dotenv import load_dotenv
load_dotenv()

CONN_STR = (
    f"DRIVER={{ODBC Driver 18 for SQL Server}};"
    f"SERVER={os.getenv('MSSQL_HOST','localhost')},1433;"
    f"DATABASE={os.getenv('MSSQL_DB','LINEAGE_DB')};"
    f"UID={os.getenv('MSSQL_USER','sa')};"
    f"PWD={os.getenv('MSSQL_PASSWORD','Lineage@2024')};"
    f"TrustServerCertificate=yes;"
)

_conn = None
def get_conn():
    global _conn
    if _conn is None:
        _conn = pyodbc.connect(CONN_STR)
    return _conn

inserted = skipped = errors = 0

def add_jurisdiction(
    jurisdiction_code: str,
    jurisdiction_name: str,
    region: str,
    regulator_name: str,
    reporting_regime: str,
    description: str,
    owner_team: str,
    status: str = "ACTIVE",
    dry_run: bool = False,
) -> int:
    global inserted, skipped, errors
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT JURISDICTION_ID FROM JURISDICTIONS WHERE JURISDICTION_CODE=?", jurisdiction_code)
    row = cur.fetchone()
    if row:
        skipped += 1
        return row[0]
    if dry_run:
        print(f"  [DRY] Would insert jurisdiction {jurisdiction_code}")
        return -1
    cur.execute("""
        INSERT INTO JURISDICTIONS
          (JURISDICTION_CODE,JURISDICTION_NAME,REGION,REGULATOR_NAME,REPORTING_REGIME,DESCRIPTION,OWNER_TEAM,STATUS)
        OUTPUT INSERTED.JURISDICTION_ID
        VALUES (?,?,?,?,?,?,?,?)
    """, jurisdiction_code, jurisdiction_name, region, regulator_name,
        reporting_regime, description, owner_team, status)
    jid = cur.fetchone()[0]
    conn.commit()
    inserted += 1
    print(f"  [OK] Jurisdiction {jurisdiction_code} → id={jid}")
    return jid


def add_field_information(
    jurisdiction_code: str,
    system_name: str,
    internal_field_name: str,
    business_name: str,
    external_display_name: str,
    business_translation: str,
    business_interpretation: str,
    technical_interpretation: str,
    example_scenario: str,
    data_type: str,
    field_category: str,
    reporting_section: str,
    is_mandatory: bool,
    criticality: str,
    source_type: str,
    owner_team: str,
    downstream: list,
    dry_run: bool = False,
) -> int:
    global inserted, skipped, errors
    conn = get_conn()
    cur = conn.cursor()
    cur.execute("SELECT JURISDICTION_ID FROM JURISDICTIONS WHERE JURISDICTION_CODE=?", jurisdiction_code)
    jrow = cur.fetchone()
    if not jrow:
        print(f"  [ERR] Jurisdiction {jurisdiction_code} not found")
        errors += 1
        return -1
    jid = jrow[0]
    cur.execute(
        "SELECT FIELD_ID FROM REGULATORY_FIELDS WHERE JURISDICTION_ID=? AND INTERNAL_FIELD_NAME=?",
        jid, internal_field_name
    )
    frow = cur.fetchone()
    if frow:
        skipped += 1
        fid = frow[0]
    else:
        if dry_run:
            print(f"  [DRY] Would insert field {internal_field_name} for {jurisdiction_code}")
            return -1
        cur.execute("""
            INSERT INTO REGULATORY_FIELDS
              (JURISDICTION_ID,SYSTEM_NAME,INTERNAL_FIELD_NAME,BUSINESS_NAME,EXTERNAL_DISPLAY_NAME,
               DATA_TYPE,FIELD_CATEGORY,REPORTING_SECTION,IS_MANDATORY,CRITICALITY,SOURCE_TYPE,OWNER_TEAM,STATUS)
            OUTPUT INSERTED.FIELD_ID
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'ACTIVE')
        """, jid, system_name, internal_field_name, business_name, external_display_name,
            data_type, field_category, reporting_section, 1 if is_mandatory else 0,
            criticality, source_type, owner_team)
        fid = cur.fetchone()[0]
        inserted += 1
        print(f"  [OK] Field {internal_field_name} ({jurisdiction_code}) → id={fid}")

    # Interpretation
    cur.execute("SELECT 1 FROM FIELD_INTERPRETATIONS WHERE FIELD_ID=?", fid)
    if not cur.fetchone():
        cur.execute("""
            INSERT INTO FIELD_INTERPRETATIONS
              (FIELD_ID,BUSINESS_TRANSLATION,BUSINESS_INTERPRETATION,TECHNICAL_INTERPRETATION,EXAMPLE_SCENARIO,STATUS)
            VALUES (?,?,?,?,?,'ACTIVE')
        """, fid, business_translation, business_interpretation, technical_interpretation, example_scenario)

    # Downstream
    for d in downstream:
        cur.execute(
            "SELECT 1 FROM FIELD_DOWNSTREAM_MAPPINGS WHERE FIELD_ID=? AND DOWNSTREAM_NAME=?",
            fid, d["downstream_name"]
        )
        if not cur.fetchone():
            cur.execute("""
                INSERT INTO FIELD_DOWNSTREAM_MAPPINGS
                  (FIELD_ID,DOWNSTREAM_NAME,DOWNSTREAM_TYPE,DOWNSTREAM_PATH_OR_FIELD,USAGE_TYPE,CRITICALITY,DESCRIPTION)
                VALUES (?,?,?,?,?,?,?)
            """, fid, d["downstream_name"], d.get("downstream_type"), d.get("downstream_path_or_field"),
                d.get("usage_type"), d.get("criticality"), d.get("description"))

    conn.commit()
    return fid


def seed_lookup_values(dry_run: bool = False):
    lookups = [
        ("CRITICALITY", "HIGH",   "High",   1),
        ("CRITICALITY", "MEDIUM", "Medium", 2),
        ("CRITICALITY", "LOW",    "Low",    3),
        ("STATUS", "ACTIVE", "Active", 1),
        ("STATUS", "DRAFT",  "Draft",  2),
        ("STATUS", "RETIRED","Retired",3),
        ("SOURCE_TYPE", "XSLT",   "XSLT Mapping",     1),
        ("SOURCE_TYPE", "JAVA",   "Java Enrichment",   2),
        ("SOURCE_TYPE", "DIRECT", "Direct Mapping",    3),
        ("SOURCE_TYPE", "DERIVED","Derived Field",     4),
        ("DATA_TYPE", "DATETIME", "DateTime", 1),
        ("DATA_TYPE", "STRING",   "String",   2),
        ("DATA_TYPE", "DECIMAL",  "Decimal",  3),
        ("DATA_TYPE", "BOOLEAN",  "Boolean",  4),
        ("DATA_TYPE", "INTEGER",  "Integer",  5),
    ]
    conn = get_conn()
    cur = conn.cursor()
    for lt, lc, ll, lo in lookups:
        cur.execute("SELECT 1 FROM LOOKUP_VALUES WHERE LOOKUP_TYPE=? AND LOOKUP_CODE=?", lt, lc)
        if not cur.fetchone():
            cur.execute(
                "INSERT INTO LOOKUP_VALUES(LOOKUP_TYPE,LOOKUP_CODE,LOOKUP_LABEL,DISPLAY_ORDER) VALUES(?,?,?,?)",
                lt, lc, ll, lo
            )
    conn.commit()


JURISDICTIONS_DATA = [
    ("JFSA", "Japan FSA", "APAC", "Financial Services Agency", "FIEL/FIEA Reporting", "Japan regulatory reporting under FIEA.", "JFSA Reporting Team"),
    ("MAS",  "Monetary Authority of Singapore", "APAC", "MAS", "EMIR-equivalent MAS Reporting", "Singapore OTC derivatives reporting.", "MAS Reporting Team"),
    ("ASIC", "Australian Securities and Investments Commission", "APAC", "ASIC", "ASIC Derivative Transaction Reporting", "Australian derivative transaction reporting.", "ASIC Reporting Team"),
    ("HKMA", "Hong Kong Monetary Authority", "APAC", "HKMA", "HKMA OTC Derivatives Reporting", "Hong Kong OTC derivatives trade reporting.", "HKMA Reporting Team"),
    ("FINMA","Swiss Financial Market Supervisory Authority","EMEA","FINMA","FMIA Reporting","Swiss financial market infrastructure reporting.","FINMA Reporting Team"),
    ("OSFI", "Office of the Superintendent of Financial Institutions", "NA", "OSFI", "OSFI Derivatives Reporting", "Canadian derivatives reporting under OSFI.", "OSFI Reporting Team"),
]

FIELDS_TEMPLATE = [
    ("EVENT_TIMESTAMP",  "Event Timestamp",  "DATETIME", "Trade Event",  "Transaction Processing", True,  "HIGH",   "XSLT"),
    ("REPORTING_ACTION", "Reporting Action", "STRING",   "Reporting",    "Action Reporting",        True,  "HIGH",   "XSLT"),
    ("VALUATION_TIMESTAMP","Valuation Timestamp","DATETIME","Valuation","Valuation Reporting",     False, "HIGH",   "JAVA"),
    ("CLEARING_STATUS",  "Clearing Status",  "STRING",   "Clearing",     "Clearing Reporting",      True,  "HIGH",   "DIRECT"),
    ("PRODUCT_CLASS",    "Product Class",    "STRING",   "Product",      "Product Classification",  True,  "MEDIUM", "XSLT"),
    ("TRADE_ID",         "Trade ID",         "STRING",   "Trade",        "Trade Identification",    True,  "HIGH",   "DIRECT"),
    ("COUNTERPARTY_ID",  "Counterparty ID",  "STRING",   "Counterparty", "Counterparty Reporting",  True,  "HIGH",   "DIRECT"),
    ("ASSET_CLASS",      "Asset Class",      "STRING",   "Asset",        "Asset Classification",    True,  "MEDIUM", "XSLT"),
    ("EVENT_TYPE",       "Event Type",       "STRING",   "Trade Event",  "Event Reporting",         True,  "HIGH",   "XSLT"),
    ("NOTIONAL_AMOUNT",  "Notional Amount",  "DECIMAL",  "Valuation",    "Financial Reporting",     True,  "HIGH",   "JAVA"),
]

DOWNSTREAM_BY_FIELD = {
    "EVENT_TIMESTAMP": [
        {"downstream_name":"DTCC GTR Gateway","downstream_type":"Regulatory Repository","downstream_path_or_field":"/report/eventTimestamp","usage_type":"PRIMARY","criticality":"HIGH","description":"Used in outbound JFSA reporting payload"},
        {"downstream_name":"Regulatory Data Warehouse","downstream_type":"Internal DWH","downstream_path_or_field":"FACT_TRADE.EVENT_TIMESTAMP","usage_type":"PRIMARY","criticality":"HIGH","description":"Stored for audit and reconciliation"},
        {"downstream_name":"ACK/NACK Reconciliation","downstream_type":"Internal System","downstream_path_or_field":"recon.eventTs","usage_type":"SECONDARY","criticality":"MEDIUM","description":"Used for matching acknowledgements"},
        {"downstream_name":"Exception Dashboard","downstream_type":"Monitoring","downstream_path_or_field":"dashboard.eventTime","usage_type":"SECONDARY","criticality":"LOW","description":"Displayed in ops exception dashboard"},
    ],
    "DEFAULT": [
        {"downstream_name":"Regulatory Data Warehouse","downstream_type":"Internal DWH","downstream_path_or_field":"FACT_TRADE.VALUE","usage_type":"PRIMARY","criticality":"HIGH","description":"Stored in central DWH"},
        {"downstream_name":"Reporting Portal","downstream_type":"Internal System","downstream_path_or_field":"report.value","usage_type":"SECONDARY","criticality":"MEDIUM","description":"Displayed in reporting portal"},
    ],
}

def run(dry_run=False):
    print("=== Seeding MSSQL ===")
    seed_lookup_values(dry_run)

    jid_map = {}
    for jcode, jname, region, regulator, regime, desc, team in JURISDICTIONS_DATA:
        jid = add_jurisdiction(jcode, jname, region, regulator, regime, desc, team, dry_run=dry_run)
        jid_map[jcode] = jid

    for jcode, _, _, _, _, _, team in JURISDICTIONS_DATA:
        for (fname, bname, dtype, category, section, mandatory, crit, src) in FIELDS_TEMPLATE:
            downstream = DOWNSTREAM_BY_FIELD.get(fname, DOWNSTREAM_BY_FIELD["DEFAULT"])
            add_field_information(
                jurisdiction_code=jcode,
                system_name=f"{jcode}_TRADE_SYSTEM",
                internal_field_name=fname,
                business_name=f"{bname}",
                external_display_name=f"{jcode} {bname}",
                business_translation=f"The {bname.lower()} as required by {jcode} regulatory reporting.",
                business_interpretation=f"Represents the {bname.lower()} for trades reported under {jcode} regime. This field is mandatory for all reportable events.",
                technical_interpretation=f"Populated via {'XSLT mapping from source XML' if src=='XSLT' else 'Java enrichment layer'} for {jcode}. Field maps to internal system field {fname}.",
                example_scenario=f"For a new trade reported to {jcode}: {fname}='2024-01-15T10:30:00Z'",
                data_type=dtype,
                field_category=category,
                reporting_section=section,
                is_mandatory=mandatory,
                criticality=crit,
                source_type=src,
                owner_team=team,
                downstream=downstream,
                dry_run=dry_run,
            )

    print(f"\n=== Done: inserted={inserted} skipped={skipped} errors={errors} ===")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
```

- [ ] **Step 2: Create .env in lineage-backend**

```bash
cat > lineage-backend/.env << 'EOF'
MSSQL_HOST=localhost
MSSQL_PORT=1433
MSSQL_DB=LINEAGE_DB
MSSQL_USER=sa
MSSQL_PASSWORD=Lineage@2024
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=lineage2024
APP_NAME=Lineage Platform API
CORS_ALLOWED_ORIGINS=http://localhost:5173
EOF
```

- [ ] **Step 3: Install dependencies and run seed**

```bash
cd lineage-backend
pip install pyodbc python-dotenv
python scripts/insert_mssql_seed.py --dry-run
python scripts/insert_mssql_seed.py
```

Expected: `inserted=66 skipped=0 errors=0` (6 jurisdictions + 60 fields + lookup values)

- [ ] **Step 4: Commit**

```bash
git add lineage-backend/scripts/insert_mssql_seed.py lineage-backend/.env
git commit -m "feat: MSSQL seed script with add_jurisdiction and add_field_information"
```

---

## Task 4: Neo4j Seed Script

**Files:**
- Create: `lineage-backend/scripts/insert_neo4j_seed.py`

- [ ] **Step 1: Write insert_neo4j_seed.py**

```python
#!/usr/bin/env python3
"""
Neo4j seed script. Run from lineage-backend/:
  python scripts/insert_neo4j_seed.py [--dry-run]
"""
import os, sys, argparse
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()
from neo4j import GraphDatabase

URI  = os.getenv("NEO4J_URI", "bolt://localhost:7687")
USER = os.getenv("NEO4J_USER", "neo4j")
PWD  = os.getenv("NEO4J_PASSWORD", "lineage2024")

_driver = None
def get_driver():
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(URI, auth=(USER, PWD))
    return _driver

def run_query(q, params=None):
    with get_driver().session() as s:
        s.run(q, **(params or {}))


def add_business_concept_to_neo4j(concept_name: str, description: str) -> None:
    run_query("""
        MERGE (bc:BusinessConcept {name: $name})
        ON CREATE SET bc.description = $description
        ON MATCH  SET bc.description = $description
    """, {"name": concept_name, "description": description})


def add_field_graph_to_neo4j(
    field_id: int,
    jurisdiction_code: str,
    internal_field_name: str,
    business_name: str,
    business_concept: str,
    xslt_file: str,
    xslt_template: str,
    variables: list,
    xpaths: list,
    java_methods: list,
    downstream: list,
) -> None:
    # Jurisdiction node
    run_query("MERGE (j:Jurisdiction {code:$code}) ON CREATE SET j.name=$code", {"code": jurisdiction_code})
    # Field node
    run_query("""
        MERGE (f:Field {fieldId:$fid})
        ON CREATE SET f.name=$name, f.jurisdiction=$jcode, f.businessName=$bname
        ON MATCH  SET f.name=$name, f.jurisdiction=$jcode, f.businessName=$bname
    """, {"fid": field_id, "name": internal_field_name, "jcode": jurisdiction_code, "bname": business_name})
    # Field → Jurisdiction
    run_query("""
        MATCH (f:Field {fieldId:$fid}), (j:Jurisdiction {code:$jcode})
        MERGE (f)-[:BELONGS_TO_JURISDICTION]->(j)
    """, {"fid": field_id, "jcode": jurisdiction_code})
    # Field → BusinessConcept
    if business_concept:
        run_query("""
            MATCH (f:Field {fieldId:$fid}), (bc:BusinessConcept {name:$bc})
            MERGE (f)-[:IMPLEMENTS_CONCEPT]->(bc)
        """, {"fid": field_id, "bc": business_concept})
    # XSLT file + template
    if xslt_file:
        run_query("MERGE (xf:XsltFile {path:$path})", {"path": xslt_file})
        run_query("MERGE (xt:XsltTemplate {name:$name}) ON CREATE SET xt.file=$file",
                  {"name": xslt_template, "file": xslt_file})
        run_query("""
            MATCH (f:Field {fieldId:$fid}), (xt:XsltTemplate {name:$xt}), (xf:XsltFile {path:$xf})
            MERGE (f)-[:PRODUCED_BY_TEMPLATE]->(xt)
            MERGE (xt)-[:DEFINED_IN_FILE]->(xf)
        """, {"fid": field_id, "xt": xslt_template, "xf": xslt_file})
    # Variables
    prev_var = None
    for v in variables:
        run_query("MERGE (xv:XsltVariable {name:$name}) ON CREATE SET xv.type=$type",
                  {"name": v["name"], "type": v.get("type","string")})
        run_query("""
            MATCH (f:Field {fieldId:$fid}), (xv:XsltVariable {name:$vn}), (xt:XsltTemplate {name:$xt})
            MERGE (f)-[:PRODUCED_BY_VARIABLE]->(xv)
            MERGE (xt)-[:TEMPLATE_USES_VARIABLE]->(xv)
        """, {"fid": field_id, "vn": v["name"], "xt": xslt_template or ""})
        if prev_var:
            run_query("""
                MATCH (a:XsltVariable {name:$a}), (b:XsltVariable {name:$b})
                MERGE (a)-[:VARIABLE_DEPENDS_ON_VARIABLE]->(b)
            """, {"a": v["name"], "b": prev_var})
        prev_var = v["name"]
    # XPaths
    for x in xpaths:
        run_query("MERGE (xp:XPath {expression:$expr})", {"expr": x["expression"]})
        for v in variables:
            run_query("""
                MATCH (xv:XsltVariable {name:$vn}), (xp:XPath {expression:$expr})
                MERGE (xv)-[:VARIABLE_READS_XPATH]->(xp)
            """, {"vn": v["name"], "expr": x["expression"]})
    # Java methods
    for m in java_methods:
        parts = m["qualifiedName"].rsplit(".", 1)
        class_name = parts[0] if len(parts) == 2 else m["qualifiedName"]
        run_query("MERGE (jc:JavaClass {qualifiedName:$cn})", {"cn": class_name})
        run_query("MERGE (jm:JavaMethod {qualifiedName:$qn}) ON CREATE SET jm.methodName=$mn, jm.className=$cn",
                  {"qn": m["qualifiedName"], "mn": parts[-1], "cn": class_name})
        run_query("""
            MATCH (jc:JavaClass {qualifiedName:$cn}), (jm:JavaMethod {qualifiedName:$qn})
            MERGE (jm)-[:DEFINED_IN_FILE]->(jc)
        """, {"cn": class_name, "qn": m["qualifiedName"]})
        run_query("""
            MATCH (f:Field {fieldId:$fid}), (jm:JavaMethod {qualifiedName:$qn})
            MERGE (f)-[:ENRICHED_BY_METHOD]->(jm)
        """, {"fid": field_id, "qn": m["qualifiedName"]})
    # Downstream
    for d in downstream:
        run_query("MERGE (ds:DownstreamSystem {code:$code}) ON CREATE SET ds.name=$name, ds.type=$type",
                  {"code": d["code"], "name": d["name"], "type": d.get("type","System")})
        run_query("""
            MATCH (f:Field {fieldId:$fid}), (ds:DownstreamSystem {code:$code})
            MERGE (f)-[:FIELD_CONSUMED_BY_SYSTEM]->(ds)
        """, {"fid": field_id, "code": d["code"]})


EVENT_TIMESTAMP_GRAPH = {
    "business_concept": "Trade Event Timestamp",
    "xslt_file": "map-event-timestamp.xsl",
    "xslt_template": "map-event-timestamp",
    "variables": [
        {"name": "v_event_timestamp",       "type": "datetime"},
        {"name": "v_asset_class",            "type": "string"},
        {"name": "v_event_type",             "type": "string"},
        {"name": "v_rates_event_timestamp",  "type": "datetime"},
        {"name": "v_equity_event_timestamp", "type": "datetime"},
    ],
    "xpaths": [
        {"expression": "/trade/rates/eventTimestamp"},
        {"expression": "/trade/equity/eventTimestamp"},
        {"expression": "/trade/common/eventTime"},
    ],
    "java_methods": [
        {"qualifiedName": "EventTimestampMapper.mapEventTimestamp"},
        {"qualifiedName": "RatesEventProcessor.getEventTimestamp"},
        {"qualifiedName": "EquityEventProcessor.getEventTimestamp"},
    ],
    "downstream": [
        {"code": "DTCC_GTR",  "name": "DTCC GTR Gateway",          "type": "Regulatory Repository"},
        {"code": "REG_DWH",   "name": "Regulatory Data Warehouse",  "type": "Internal DWH"},
        {"code": "ACK_RECON", "name": "ACK/NACK Reconciliation",    "type": "Internal System"},
        {"code": "EXC_DASH",  "name": "Exception Dashboard",        "type": "Monitoring"},
    ],
}

DEFAULT_GRAPH = {
    "business_concept": "Trade Data",
    "xslt_file": "map-trade-data.xsl",
    "xslt_template": "map-default",
    "variables": [{"name": "v_field_value", "type": "string"}],
    "xpaths": [{"expression": "/trade/common/value"}],
    "java_methods": [{"qualifiedName": "TradeDataMapper.mapField"}],
    "downstream": [
        {"code": "REG_DWH",  "name": "Regulatory Data Warehouse", "type": "Internal DWH"},
        {"code": "REP_PORTAL","name": "Reporting Portal",          "type": "Internal System"},
    ],
}

FIELDS = [
    "EVENT_TIMESTAMP","REPORTING_ACTION","VALUATION_TIMESTAMP","CLEARING_STATUS","PRODUCT_CLASS",
    "TRADE_ID","COUNTERPARTY_ID","ASSET_CLASS","EVENT_TYPE","NOTIONAL_AMOUNT"
]
JURISDICTIONS = ["JFSA","MAS","ASIC","HKMA","FINMA","OSFI"]


def run(dry_run=False):
    print("=== Seeding Neo4j ===")

    concepts = ["Trade Event Timestamp","Reporting Action","Valuation","Clearing","Product Classification",
                "Trade Identification","Counterparty","Asset Class","Event Classification","Notional Value",
                "Trade Data"]
    for c in concepts:
        if not dry_run:
            add_business_concept_to_neo4j(c, f"Business concept: {c}")
        print(f"  [{'DRY' if dry_run else 'OK'}] BusinessConcept: {c}")

    # We need field_ids from MSSQL — use sequential approximation based on seed order
    # JFSA fields: 1-10, MAS: 11-20, ASIC: 21-30, HKMA: 31-40, FINMA: 41-50, OSFI: 51-60
    field_id = 1
    for jcode in JURISDICTIONS:
        for i, fname in enumerate(FIELDS):
            g = EVENT_TIMESTAMP_GRAPH if fname == "EVENT_TIMESTAMP" else DEFAULT_GRAPH
            g2 = {**g, "variables": [{**v, "name": f"v_{fname.lower()}_{v['name'].split('_',1)[-1]}"}
                                      for v in g["variables"]]} if fname != "EVENT_TIMESTAMP" else g
            if not dry_run:
                add_field_graph_to_neo4j(
                    field_id=field_id,
                    jurisdiction_code=jcode,
                    internal_field_name=fname,
                    business_name=fname.replace("_"," ").title(),
                    business_concept=g["business_concept"],
                    xslt_file=g["xslt_file"],
                    xslt_template=g["xslt_template"],
                    variables=g2["variables"],
                    xpaths=g["xpaths"],
                    java_methods=g["java_methods"],
                    downstream=g["downstream"],
                )
            print(f"  [{'DRY' if dry_run else 'OK'}] Graph: {jcode}/{fname} (id={field_id})")
            field_id += 1

    print("\n=== Neo4j seed complete ===")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    run(dry_run=args.dry_run)
```

- [ ] **Step 2: Run Neo4j seed**

```bash
cd lineage-backend
pip install neo4j
python scripts/insert_neo4j_seed.py --dry-run
python scripts/insert_neo4j_seed.py
```

Expected: 11 concept nodes, 60 field nodes, relationships for all fields.

- [ ] **Step 3: Rewrite insert_sample_data.py as orchestrator**

```python
#!/usr/bin/env python3
import sys, argparse, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.insert_mssql_seed import run as run_mssql
from scripts.insert_neo4j_seed import run as run_neo4j

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--only", choices=["mssql","neo4j"])
    args = parser.parse_args()
    if args.only != "neo4j": run_mssql(dry_run=args.dry_run)
    if args.only != "mssql": run_neo4j(dry_run=args.dry_run)
```

- [ ] **Step 4: Commit**

```bash
git add lineage-backend/scripts/
git commit -m "feat: Neo4j seed — add_business_concept_to_neo4j + add_field_graph_to_neo4j"
```

---

## Task 5: Backend Infrastructure (Config + DB Clients + Models)

**Files:**
- Modify: `lineage-backend/app/core/config.py`
- Modify: `lineage-backend/app/db/mssql.py`
- Modify: `lineage-backend/app/db/neo4j.py`
- Modify: `lineage-backend/app/db/__init__.py`
- Modify: `lineage-backend/app/core/response.py`
- Create: `lineage-backend/app/utils/pagination.py`
- Create: `lineage-backend/app/models/common.py`

- [ ] **Step 1: Write config.py**

```python
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    app_name: str = "Lineage Platform API"
    mssql_host: str = "localhost"
    mssql_port: int = 1433
    mssql_db: str = "LINEAGE_DB"
    mssql_user: str = "sa"
    mssql_password: str = "Lineage@2024"
    neo4j_uri: str = "bolt://localhost:7687"
    neo4j_user: str = "neo4j"
    neo4j_password: str = "lineage2024"
    cors_allowed_origins: str = "http://localhost:5173"

    class Config:
        env_file = ".env"

settings = Settings()
```

- [ ] **Step 2: Write app/db/mssql.py**

```python
from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from app.core.config import settings

_engine: Engine = None

def get_engine() -> Engine:
    global _engine
    if _engine is None:
        conn_str = (
            f"mssql+pyodbc://{settings.mssql_user}:{settings.mssql_password}"
            f"@{settings.mssql_host}:{settings.mssql_port}/{settings.mssql_db}"
            "?driver=ODBC+Driver+18+for+SQL+Server&TrustServerCertificate=yes"
        )
        _engine = create_engine(conn_str, pool_pre_ping=True, pool_size=5, max_overflow=10)
    return _engine

def get_connection():
    return get_engine().connect()

def init_mssql():
    try:
        with get_connection() as conn:
            conn.execute(text("SELECT 1"))
        print("MSSQL connected.")
    except Exception as e:
        print(f"MSSQL connection failed: {e}")

def check_mssql_connection() -> bool:
    try:
        with get_connection() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except:
        return False
```

- [ ] **Step 3: Write app/db/neo4j.py**

```python
from neo4j import GraphDatabase, Driver
from app.core.config import settings

_driver: Driver = None

def get_driver() -> Driver:
    global _driver
    if _driver is None:
        _driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password)
        )
    return _driver

def get_session():
    return get_driver().session()

def init_neo4j():
    try:
        get_driver().verify_connectivity()
        print("Neo4j connected.")
    except Exception as e:
        print(f"Neo4j connection failed: {e}")

def close_neo4j():
    global _driver
    if _driver:
        _driver.close()
        _driver = None

def check_neo4j_connection() -> bool:
    try:
        get_driver().verify_connectivity()
        return True
    except:
        return False
```

- [ ] **Step 4: Write app/db/__init__.py**

```python
from app.db.mssql import init_mssql, check_mssql_connection, get_connection
from app.db.neo4j import init_neo4j, close_neo4j, check_neo4j_connection, get_session
```

- [ ] **Step 5: Write app/core/response.py**

```python
from pydantic import BaseModel
from typing import Any, List, Optional

class ApiError(BaseModel):
    code: str
    field: Optional[str] = None
    detail: str

class ApiResponse(BaseModel):
    success: bool
    data: Any = None
    message: Optional[str] = None
    errors: List[ApiError] = []

class PaginatedData(BaseModel):
    items: List[Any]
    page: int
    pageSize: int
    totalItems: int
    totalPages: int
    hasNext: bool
    hasPrevious: bool

class PaginatedResponse(BaseModel):
    success: bool
    data: PaginatedData
    message: Optional[str] = None
    errors: List[ApiError] = []
```

- [ ] **Step 6: Write app/utils/pagination.py**

```python
from typing import Tuple
from fastapi import Query

def get_pagination(page: int = Query(1, ge=1), pageSize: int = Query(25)) -> Tuple[int,int]:
    allowed = [10, 25, 50, 100]
    if pageSize not in allowed:
        pageSize = 25
    offset = (page - 1) * pageSize
    return page, pageSize, offset

def make_paginated_data(items, total, page, page_size):
    from app.core.response import PaginatedData
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedData(
        items=items, page=page, pageSize=page_size,
        totalItems=total, totalPages=total_pages,
        hasNext=page < total_pages, hasPrevious=page > 1
    )
```

- [ ] **Step 7: Write requirements.txt**

```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
sqlalchemy>=2.0.0
pyodbc>=5.0.0
neo4j>=5.0.0
pydantic>=2.0.0
pydantic-settings>=2.0.0
python-dotenv>=1.0.0
```

- [ ] **Step 8: Install and verify startup**

```bash
cd lineage-backend
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
# In another terminal:
curl http://localhost:8000/api/health
```

Expected: `{"success":true,"data":{"status":"ok"},...}`

- [ ] **Step 9: Commit**

```bash
git add lineage-backend/app/ lineage-backend/requirements.txt
git commit -m "feat: backend infrastructure — config, DB clients, response envelope, pagination"
```

---

## Task 6: Health + Lookup Routes

**Files:**
- Modify: `lineage-backend/app/api/routes/health_routes.py`
- Create: `lineage-backend/app/repositories/lookup_repository.py`
- Create: `lineage-backend/app/services/lookup_service.py`
- Modify: `lineage-backend/app/api/routes/lookup_routes.py`

- [ ] **Step 1: Write health_routes.py**

```python
from fastapi import APIRouter
from app.core.response import ApiResponse
from app.db import check_mssql_connection, check_neo4j_connection

router = APIRouter(prefix="/health", tags=["health"])

@router.get("")
def health():
    return ApiResponse(success=True, data={"status": "ok"})

@router.get("/dependencies")
def health_deps():
    mssql_ok = check_mssql_connection()
    neo4j_ok = check_neo4j_connection()
    return ApiResponse(success=True, data={
        "mssql": "ok" if mssql_ok else "error",
        "neo4j": "ok" if neo4j_ok else "error",
        "overall": "ok" if (mssql_ok and neo4j_ok) else "degraded",
    })
```

- [ ] **Step 2: Write lookup_repository.py**

```python
from sqlalchemy import text
from app.db import get_connection

def get_lookup_values(lookup_type: str) -> list:
    with get_connection() as conn:
        rows = conn.execute(text("""
            SELECT LOOKUP_CODE, LOOKUP_LABEL, DISPLAY_ORDER
            FROM LOOKUP_VALUES
            WHERE LOOKUP_TYPE=:lt AND IS_ACTIVE=1
            ORDER BY DISPLAY_ORDER
        """), {"lt": lookup_type}).fetchall()
    return [{"code": r[0], "label": r[1]} for r in rows]

def get_jurisdictions_lookup() -> list:
    with get_connection() as conn:
        rows = conn.execute(text("""
            SELECT JURISDICTION_CODE, JURISDICTION_NAME, REGION, STATUS
            FROM JURISDICTIONS ORDER BY JURISDICTION_CODE
        """)).fetchall()
    return [{"code": r[0], "name": r[1], "region": r[2], "status": r[3]} for r in rows]

def get_downstream_systems_lookup() -> list:
    with get_connection() as conn:
        rows = conn.execute(text("""
            SELECT DISTINCT DOWNSTREAM_NAME, DOWNSTREAM_TYPE
            FROM FIELD_DOWNSTREAM_MAPPINGS ORDER BY DOWNSTREAM_NAME
        """)).fetchall()
    return [{"name": r[0], "type": r[1]} for r in rows]
```

- [ ] **Step 3: Write lookup_routes.py**

```python
from fastapi import APIRouter
from app.repositories.lookup_repository import (
    get_lookup_values, get_jurisdictions_lookup, get_downstream_systems_lookup
)
from app.core.response import ApiResponse

router = APIRouter(prefix="/lookups", tags=["lookups"])

@router.get("/jurisdictions")
def lookups_jurisdictions():
    return ApiResponse(success=True, data=get_jurisdictions_lookup())

@router.get("/criticalities")
def lookups_criticalities():
    return ApiResponse(success=True, data=get_lookup_values("CRITICALITY"))

@router.get("/statuses")
def lookups_statuses():
    return ApiResponse(success=True, data=get_lookup_values("STATUS"))

@router.get("/source-types")
def lookups_source_types():
    return ApiResponse(success=True, data=get_lookup_values("SOURCE_TYPE"))

@router.get("/downstream-systems")
def lookups_downstream():
    return ApiResponse(success=True, data=get_downstream_systems_lookup())
```

- [ ] **Step 4: Test**

```bash
curl http://localhost:8000/api/lookups/jurisdictions
curl http://localhost:8000/api/lookups/criticalities
```

Expected: JSON arrays with JFSA, MAS, ASIC, HKMA, FINMA, OSFI.

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/api/routes/health_routes.py \
        lineage-backend/app/repositories/lookup_repository.py \
        lineage-backend/app/api/routes/lookup_routes.py
git commit -m "feat: health + lookup routes backed by real MSSQL queries"
```

---

## Task 7: Dashboard Routes

**Files:**
- Create: `lineage-backend/app/repositories/dashboard_repository.py`
- Modify: `lineage-backend/app/api/routes/dashboard_routes.py`

- [ ] **Step 1: Write dashboard_repository.py**

```python
from sqlalchemy import text
from app.db import get_connection

def get_summary():
    with get_connection() as conn:
        total_j = conn.execute(text("SELECT COUNT(*) FROM JURISDICTIONS WHERE STATUS='ACTIVE'")).scalar()
        total_f = conn.execute(text("SELECT COUNT(*) FROM REGULATORY_FIELDS WHERE STATUS='ACTIVE'")).scalar()
        high_risk = conn.execute(text(
            "SELECT COUNT(*) FROM REGULATORY_FIELDS WHERE CRITICALITY='HIGH' AND STATUS='ACTIVE'"
        )).scalar()
        with_interp = conn.execute(text("""
            SELECT COUNT(DISTINCT rf.FIELD_ID) FROM REGULATORY_FIELDS rf
            JOIN FIELD_INTERPRETATIONS fi ON fi.FIELD_ID=rf.FIELD_ID
            WHERE rf.STATUS='ACTIVE'
        """)).scalar()
    coverage = round((with_interp / total_f * 100), 1) if total_f else 0
    return {
        "total_jurisdictions": total_j,
        "total_fields": total_f,
        "lineage_coverage_percent": coverage,
        "high_risk_fields": high_risk,
        "fields_with_lineage": with_interp,
        "fields_missing_business_interpretation": total_f - with_interp,
    }

def get_lineage_coverage():
    with get_connection() as conn:
        rows = conn.execute(text("""
            SELECT j.JURISDICTION_CODE, j.JURISDICTION_NAME,
                   COUNT(rf.FIELD_ID) AS total,
                   COUNT(fi.FIELD_ID) AS with_interp
            FROM JURISDICTIONS j
            LEFT JOIN REGULATORY_FIELDS rf ON rf.JURISDICTION_ID=j.JURISDICTION_ID AND rf.STATUS='ACTIVE'
            LEFT JOIN FIELD_INTERPRETATIONS fi ON fi.FIELD_ID=rf.FIELD_ID
            WHERE j.STATUS='ACTIVE'
            GROUP BY j.JURISDICTION_CODE, j.JURISDICTION_NAME
            ORDER BY j.JURISDICTION_CODE
        """)).fetchall()
    return [{"jurisdiction": r[0], "name": r[1],
             "total": r[2], "with_lineage": r[3],
             "coverage": round(r[3]/r[2]*100,1) if r[2] else 0} for r in rows]

def get_high_risk_fields(limit=10):
    with get_connection() as conn:
        rows = conn.execute(text("""
            SELECT TOP(:lim) rf.FIELD_ID, rf.INTERNAL_FIELD_NAME, rf.BUSINESS_NAME,
                   rf.CRITICALITY, rf.STATUS, j.JURISDICTION_CODE
            FROM REGULATORY_FIELDS rf
            JOIN JURISDICTIONS j ON j.JURISDICTION_ID=rf.JURISDICTION_ID
            WHERE rf.CRITICALITY='HIGH' AND rf.STATUS='ACTIVE'
            ORDER BY rf.FIELD_ID
        """), {"lim": limit}).fetchall()
    return [{"field_id":r[0],"field_name":r[1],"business_name":r[2],
             "criticality":r[3],"status":r[4],"jurisdiction":r[5]} for r in rows]

def get_recent_changes(limit=10):
    with get_connection() as conn:
        rows = conn.execute(text("""
            SELECT TOP(:lim) al.AUDIT_ID, al.ENTITY_TYPE, al.ENTITY_ID,
                   al.ACTION_TYPE, al.PERFORMED_BY, al.PERFORMED_AT, al.REMARKS
            FROM AUDIT_LOG al ORDER BY al.PERFORMED_AT DESC
        """), {"lim": limit}).fetchall()
    return [{"audit_id":r[0],"entity_type":r[1],"entity_id":r[2],
             "action_type":r[3],"performed_by":r[4],
             "performed_at": str(r[5]) if r[5] else None,"remarks":r[6]} for r in rows]

def get_jurisdiction_breakdown():
    with get_connection() as conn:
        rows = conn.execute(text("""
            SELECT j.JURISDICTION_CODE, COUNT(rf.FIELD_ID) as field_count,
                   SUM(CASE WHEN rf.CRITICALITY='HIGH' THEN 1 ELSE 0 END) as high_risk
            FROM JURISDICTIONS j
            LEFT JOIN REGULATORY_FIELDS rf ON rf.JURISDICTION_ID=j.JURISDICTION_ID AND rf.STATUS='ACTIVE'
            WHERE j.STATUS='ACTIVE'
            GROUP BY j.JURISDICTION_CODE
            ORDER BY field_count DESC
        """)).fetchall()
    return [{"jurisdiction":r[0],"field_count":r[1],"high_risk":r[2]} for r in rows]
```

- [ ] **Step 2: Rewrite dashboard_routes.py**

```python
from fastapi import APIRouter
from app.repositories.dashboard_repository import (
    get_summary, get_lineage_coverage, get_high_risk_fields,
    get_recent_changes, get_jurisdiction_breakdown
)
from app.core.response import ApiResponse

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

@router.get("/summary")
def dashboard_summary():
    return ApiResponse(success=True, data=get_summary())

@router.get("/lineage-coverage")
def dashboard_lineage_coverage():
    return ApiResponse(success=True, data=get_lineage_coverage())

@router.get("/high-risk-fields")
def dashboard_high_risk_fields():
    return ApiResponse(success=True, data=get_high_risk_fields())

@router.get("/recent-changes")
def dashboard_recent_changes():
    return ApiResponse(success=True, data=get_recent_changes())

@router.get("/top-impacted-dependencies")
def dashboard_top_dependencies():
    return ApiResponse(success=True, data=get_jurisdiction_breakdown())
```

- [ ] **Step 3: Test**

```bash
curl http://localhost:8000/api/dashboard/summary
curl http://localhost:8000/api/dashboard/lineage-coverage
```

Expected: real counts (total_fields=60, total_jurisdictions=6).

- [ ] **Step 4: Commit**

```bash
git add lineage-backend/app/repositories/dashboard_repository.py \
        lineage-backend/app/api/routes/dashboard_routes.py
git commit -m "feat: dashboard routes with real MSSQL aggregation queries"
```

---

## Task 8: Jurisdiction Routes

**Files:**
- Create: `lineage-backend/app/repositories/jurisdiction_repository.py`
- Modify: `lineage-backend/app/api/routes/jurisdiction_routes.py`

- [ ] **Step 1: Write jurisdiction_repository.py**

```python
from sqlalchemy import text
from app.db import get_connection

def list_jurisdictions(search=None, status=None, region=None, page=1, page_size=25):
    where = ["1=1"]
    params = {}
    if search:
        where.append("(j.JURISDICTION_CODE LIKE :s OR j.JURISDICTION_NAME LIKE :s)")
        params["s"] = f"%{search}%"
    if status:
        where.append("j.STATUS=:status")
        params["status"] = status
    if region:
        where.append("j.REGION=:region")
        params["region"] = region
    where_clause = " AND ".join(where)
    offset = (page - 1) * page_size
    with get_connection() as conn:
        total = conn.execute(text(
            f"SELECT COUNT(*) FROM JURISDICTIONS j WHERE {where_clause}"
        ), params).scalar()
        rows = conn.execute(text(f"""
            SELECT j.JURISDICTION_ID, j.JURISDICTION_CODE, j.JURISDICTION_NAME, j.REGION,
                   j.REGULATOR_NAME, j.REPORTING_REGIME, j.OWNER_TEAM, j.STATUS, j.CREATED_AT,
                   COUNT(rf.FIELD_ID) as field_count
            FROM JURISDICTIONS j
            LEFT JOIN REGULATORY_FIELDS rf ON rf.JURISDICTION_ID=j.JURISDICTION_ID AND rf.STATUS='ACTIVE'
            WHERE {where_clause}
            GROUP BY j.JURISDICTION_ID, j.JURISDICTION_CODE, j.JURISDICTION_NAME, j.REGION,
                     j.REGULATOR_NAME, j.REPORTING_REGIME, j.OWNER_TEAM, j.STATUS, j.CREATED_AT
            ORDER BY j.JURISDICTION_CODE
            OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY
        """), {**params, "offset": offset, "size": page_size}).fetchall()
    items = [{"jurisdiction_id":r[0],"jurisdiction_code":r[1],"jurisdiction_name":r[2],
              "region":r[3],"regulator_name":r[4],"reporting_regime":r[5],
              "owner_team":r[6],"status":r[7],"created_at":str(r[8]),
              "field_count":r[9]} for r in rows]
    return items, total

def get_jurisdiction_by_code(code: str):
    with get_connection() as conn:
        row = conn.execute(text("""
            SELECT j.JURISDICTION_ID, j.JURISDICTION_CODE, j.JURISDICTION_NAME, j.REGION,
                   j.REGULATOR_NAME, j.REPORTING_REGIME, j.DESCRIPTION, j.OWNER_TEAM,
                   j.STATUS, j.CREATED_AT, COUNT(rf.FIELD_ID) as field_count,
                   SUM(CASE WHEN rf.CRITICALITY='HIGH' THEN 1 ELSE 0 END) as high_risk
            FROM JURISDICTIONS j
            LEFT JOIN REGULATORY_FIELDS rf ON rf.JURISDICTION_ID=j.JURISDICTION_ID AND rf.STATUS='ACTIVE'
            WHERE j.JURISDICTION_CODE=:code
            GROUP BY j.JURISDICTION_ID, j.JURISDICTION_CODE, j.JURISDICTION_NAME, j.REGION,
                     j.REGULATOR_NAME, j.REPORTING_REGIME, j.DESCRIPTION, j.OWNER_TEAM,
                     j.STATUS, j.CREATED_AT
        """), {"code": code}).fetchone()
    if not row:
        return None
    return {"jurisdiction_id":row[0],"jurisdiction_code":row[1],"jurisdiction_name":row[2],
            "region":row[3],"regulator_name":row[4],"reporting_regime":row[5],
            "description":row[6],"owner_team":row[7],"status":row[8],
            "created_at":str(row[9]),"field_count":row[10],"high_risk_count":row[11]}
```

- [ ] **Step 2: Write jurisdiction_routes.py**

```python
from fastapi import APIRouter, Query, HTTPException
from app.repositories.jurisdiction_repository import list_jurisdictions, get_jurisdiction_by_code
from app.core.response import ApiResponse, PaginatedResponse
from app.utils.pagination import make_paginated_data

router = APIRouter(prefix="/jurisdictions", tags=["jurisdictions"])

@router.get("")
def get_jurisdictions(
    search: str = Query(None), status: str = Query(None),
    region: str = Query(None), page: int = Query(1, ge=1), pageSize: int = Query(25)
):
    items, total = list_jurisdictions(search, status, region, page, pageSize)
    return PaginatedResponse(success=True, data=make_paginated_data(items, total, page, pageSize))

@router.get("/{jurisdiction_code}")
def get_jurisdiction(jurisdiction_code: str):
    j = get_jurisdiction_by_code(jurisdiction_code)
    if not j:
        raise HTTPException(404, detail=f"Jurisdiction {jurisdiction_code} not found")
    return ApiResponse(success=True, data=j)
```

- [ ] **Step 3: Test**

```bash
curl "http://localhost:8000/api/jurisdictions?page=1&pageSize=25"
curl "http://localhost:8000/api/jurisdictions/JFSA"
```

Expected: 6 jurisdictions in first call, JFSA detail in second.

- [ ] **Step 4: Commit**

```bash
git add lineage-backend/app/repositories/jurisdiction_repository.py \
        lineage-backend/app/api/routes/jurisdiction_routes.py
git commit -m "feat: jurisdiction routes with real MSSQL queries and pagination"
```

---

## Task 9: Field Routes (List + Detail)

**Files:**
- Create: `lineage-backend/app/repositories/field_repository.py` (rewrite)
- Create: `lineage-backend/app/repositories/interpretation_repository.py`
- Modify: `lineage-backend/app/api/routes/field_routes.py`

- [ ] **Step 1: Write field_repository.py**

```python
from sqlalchemy import text
from app.db import get_connection

def list_fields(jurisdiction=None, search=None, criticality=None, status=None,
                source_type=None, page=1, page_size=25):
    where = ["rf.STATUS != 'DELETED'"]
    params = {}
    if jurisdiction:
        where.append("j.JURISDICTION_CODE=:jcode")
        params["jcode"] = jurisdiction
    if search:
        where.append("(rf.INTERNAL_FIELD_NAME LIKE :s OR rf.BUSINESS_NAME LIKE :s)")
        params["s"] = f"%{search}%"
    if criticality:
        where.append("rf.CRITICALITY=:crit")
        params["crit"] = criticality
    if status:
        where.append("rf.STATUS=:status")
        params["status"] = status
    if source_type:
        where.append("rf.SOURCE_TYPE=:src")
        params["src"] = source_type
    wc = " AND ".join(where)
    offset = (page - 1) * page_size
    with get_connection() as conn:
        total = conn.execute(text(f"""
            SELECT COUNT(*) FROM REGULATORY_FIELDS rf
            JOIN JURISDICTIONS j ON j.JURISDICTION_ID=rf.JURISDICTION_ID WHERE {wc}
        """), params).scalar()
        rows = conn.execute(text(f"""
            SELECT rf.FIELD_ID, rf.INTERNAL_FIELD_NAME, rf.BUSINESS_NAME, rf.EXTERNAL_DISPLAY_NAME,
                   rf.DATA_TYPE, rf.FIELD_CATEGORY, rf.REPORTING_SECTION, rf.IS_MANDATORY,
                   rf.CRITICALITY, rf.SOURCE_TYPE, rf.OWNER_TEAM, rf.STATUS,
                   rf.CREATED_AT, rf.UPDATED_AT, j.JURISDICTION_CODE, j.JURISDICTION_NAME,
                   rf.SYSTEM_NAME
            FROM REGULATORY_FIELDS rf
            JOIN JURISDICTIONS j ON j.JURISDICTION_ID=rf.JURISDICTION_ID
            WHERE {wc}
            ORDER BY rf.FIELD_ID
            OFFSET :offset ROWS FETCH NEXT :size ROWS ONLY
        """), {**params, "offset": offset, "size": page_size}).fetchall()
    return [_map_field_row(r) for r in rows], total

def get_field_by_id(field_id: int):
    with get_connection() as conn:
        row = conn.execute(text("""
            SELECT rf.FIELD_ID, rf.INTERNAL_FIELD_NAME, rf.BUSINESS_NAME, rf.EXTERNAL_DISPLAY_NAME,
                   rf.DATA_TYPE, rf.FIELD_CATEGORY, rf.REPORTING_SECTION, rf.IS_MANDATORY,
                   rf.CRITICALITY, rf.SOURCE_TYPE, rf.OWNER_TEAM, rf.STATUS,
                   rf.CREATED_AT, rf.UPDATED_AT, j.JURISDICTION_CODE, j.JURISDICTION_NAME,
                   rf.SYSTEM_NAME, rf.DESCRIPTION
            FROM REGULATORY_FIELDS rf
            JOIN JURISDICTIONS j ON j.JURISDICTION_ID=rf.JURISDICTION_ID
            WHERE rf.FIELD_ID=:fid
        """), {"fid": field_id}).fetchone()
    return _map_field_row(row, include_description=True) if row else None

def _map_field_row(r, include_description=False):
    d = {
        "field_id": r[0], "internal_field_name": r[1], "business_name": r[2],
        "external_display_name": r[3], "data_type": r[4], "field_category": r[5],
        "reporting_section": r[6], "is_mandatory": bool(r[7]), "criticality": r[8],
        "source_type": r[9], "owner_team": r[10], "status": r[11],
        "created_at": str(r[12]) if r[12] else None,
        "updated_at": str(r[13]) if r[13] else None,
        "jurisdiction_code": r[14], "jurisdiction_name": r[15], "system_name": r[16],
    }
    if include_description and len(r) > 17:
        d["description"] = r[17]
    return d

def get_field_downstream(field_id: int):
    with get_connection() as conn:
        rows = conn.execute(text("""
            SELECT DOWNSTREAM_MAPPING_ID, DOWNSTREAM_NAME, DOWNSTREAM_TYPE,
                   DOWNSTREAM_PATH_OR_FIELD, USAGE_TYPE, CRITICALITY, DESCRIPTION
            FROM FIELD_DOWNSTREAM_MAPPINGS WHERE FIELD_ID=:fid ORDER BY CRITICALITY
        """), {"fid": field_id}).fetchall()
    return [{"mapping_id":r[0],"downstream_name":r[1],"downstream_type":r[2],
             "path_or_field":r[3],"usage_type":r[4],"criticality":r[5],"description":r[6]}
            for r in rows]

def get_field_history(field_id: int):
    with get_connection() as conn:
        rows = conn.execute(text("""
            SELECT VERSION_ID, VERSION_NO, CHANGE_REASON, CHANGED_BY, CHANGED_AT
            FROM FIELD_VERSIONS WHERE FIELD_ID=:fid ORDER BY VERSION_NO DESC
        """), {"fid": field_id}).fetchall()
    return [{"version_id":r[0],"version_no":r[1],"change_reason":r[2],
             "changed_by":r[3],"changed_at":str(r[4])} for r in rows]
```

- [ ] **Step 2: Write interpretation_repository.py**

```python
from sqlalchemy import text
from app.db import get_connection

def get_interpretation(field_id: int):
    with get_connection() as conn:
        row = conn.execute(text("""
            SELECT INTERPRETATION_ID, BUSINESS_TRANSLATION, BUSINESS_INTERPRETATION,
                   TECHNICAL_INTERPRETATION, EXAMPLE_SCENARIO, ASSUMPTIONS, STATUS
            FROM FIELD_INTERPRETATIONS WHERE FIELD_ID=:fid
        """), {"fid": field_id}).fetchone()
    if not row:
        return None
    return {
        "interpretation_id": row[0],
        "business_translation": row[1],
        "business_interpretation": row[2],
        "technical_interpretation": row[3],
        "example_scenario": row[4],
        "assumptions": row[5],
        "status": row[6],
    }
```

- [ ] **Step 3: Rewrite field_routes.py**

```python
from fastapi import APIRouter, Query, HTTPException
from app.repositories.field_repository import (
    list_fields, get_field_by_id, get_field_downstream, get_field_history
)
from app.repositories.interpretation_repository import get_interpretation
from app.core.response import ApiResponse, PaginatedResponse
from app.utils.pagination import make_paginated_data

router = APIRouter(prefix="/fields", tags=["fields"])

@router.get("")
def search_fields(
    jurisdiction: str = Query(None), search: str = Query(None),
    criticality: str = Query(None), status: str = Query(None),
    source_type: str = Query(None),
    page: int = Query(1, ge=1), pageSize: int = Query(25)
):
    items, total = list_fields(jurisdiction, search, criticality, status, source_type, page, pageSize)
    return PaginatedResponse(success=True, data=make_paginated_data(items, total, page, pageSize))

@router.get("/{field_id}")
def get_field(field_id: int):
    f = get_field_by_id(field_id)
    if not f:
        raise HTTPException(404, detail=f"Field {field_id} not found")
    return ApiResponse(success=True, data=f)

@router.get("/{field_id}/overview")
def get_field_overview(field_id: int):
    f = get_field_by_id(field_id)
    if not f:
        raise HTTPException(404, detail=f"Field {field_id} not found")
    interp = get_interpretation(field_id)
    downstream = get_field_downstream(field_id)
    return ApiResponse(success=True, data={**f, "interpretation": interp, "downstream_count": len(downstream)})

@router.get("/{field_id}/business")
def get_field_business(field_id: int):
    interp = get_interpretation(field_id)
    if not interp:
        raise HTTPException(404, detail="Interpretation not found")
    return ApiResponse(success=True, data=interp)

@router.get("/{field_id}/technical")
def get_field_technical(field_id: int):
    f = get_field_by_id(field_id)
    if not f:
        raise HTTPException(404, detail=f"Field {field_id} not found")
    interp = get_interpretation(field_id)
    return ApiResponse(success=True, data={"field": f, "interpretation": interp})

@router.get("/{field_id}/downstream")
def get_field_downstream_list(field_id: int):
    return ApiResponse(success=True, data=get_field_downstream(field_id))

@router.get("/{field_id}/history")
def get_field_history_list(field_id: int):
    return ApiResponse(success=True, data=get_field_history(field_id))
```

- [ ] **Step 4: Test**

```bash
curl "http://localhost:8000/api/fields?page=1&pageSize=10"
curl "http://localhost:8000/api/fields?jurisdiction=JFSA"
curl "http://localhost:8000/api/fields/1"
curl "http://localhost:8000/api/fields/1/overview"
curl "http://localhost:8000/api/fields/1/business"
```

Expected: 60 total fields, 10 for JFSA.

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/repositories/ lineage-backend/app/api/routes/field_routes.py
git commit -m "feat: field list + field detail routes with real MSSQL queries"
```

---

## Task 10: Lineage Routes (XSLT + Java + Downstream via Neo4j)

**Files:**
- Create: `lineage-backend/app/graph/cypher_queries.py`
- Create: `lineage-backend/app/graph/lineage_graph_service.py`
- Modify: `lineage-backend/app/api/routes/lineage_routes.py`

- [ ] **Step 1: Write cypher_queries.py**

```python
# All parameterized Cypher queries

FIELD_XSLT_DRILLDOWN = """
MATCH (f:Field {fieldId: $fid})-[:PRODUCED_BY_TEMPLATE]->(xt:XsltTemplate)-[:DEFINED_IN_FILE]->(xf:XsltFile)
OPTIONAL MATCH (xt)-[:TEMPLATE_USES_VARIABLE]->(xv:XsltVariable)
OPTIONAL MATCH (xv)-[:VARIABLE_READS_XPATH]->(xp:XPath)
RETURN xf.path AS file, xt.name AS template,
       collect(DISTINCT xv.name) AS variables,
       collect(DISTINCT xp.expression) AS xpaths
"""

FIELD_VARIABLES = """
MATCH (f:Field {fieldId: $fid})-[:PRODUCED_BY_VARIABLE]->(xv:XsltVariable)
OPTIONAL MATCH (xv)-[:VARIABLE_DEPENDS_ON_VARIABLE]->(dep:XsltVariable)
OPTIONAL MATCH (xv)-[:VARIABLE_READS_XPATH]->(xp:XPath)
RETURN xv.name AS name, xv.type AS type,
       collect(DISTINCT dep.name) AS depends_on,
       collect(DISTINCT xp.expression) AS xpaths
"""

FIELD_JAVA_DRILLDOWN = """
MATCH (f:Field {fieldId: $fid})-[:ENRICHED_BY_METHOD]->(jm:JavaMethod)-[:DEFINED_IN_FILE]->(jc:JavaClass)
OPTIONAL MATCH (jm)-[:METHOD_CALLS_METHOD]->(called:JavaMethod)
RETURN jc.qualifiedName AS class_name, jm.qualifiedName AS method,
       jm.methodName AS method_name,
       collect(DISTINCT called.qualifiedName) AS calls
"""

FIELD_DOWNSTREAM_GRAPH = """
MATCH (f:Field {fieldId: $fid})-[:FIELD_CONSUMED_BY_SYSTEM]->(ds:DownstreamSystem)
RETURN ds.code AS code, ds.name AS name, ds.type AS type
"""

FIELD_IMPACT = """
MATCH (f:Field {fieldId: $fid})-[*1..3]->(n)
RETURN DISTINCT labels(n)[0] AS node_type, 
       COALESCE(n.name, n.qualifiedName, n.expression, n.code) AS node_name,
       n AS node
LIMIT 50
"""

GRAPH_SUBGRAPH = """
MATCH (start {fieldId: $fid})
CALL apoc.path.subgraphNodes(start, {maxLevel: $depth}) YIELD node
OPTIONAL MATCH (node)-[r]->(neighbor)
RETURN node, r, neighbor LIMIT 200
"""

GRAPH_SEARCH = """
MATCH (n)
WHERE (n.name CONTAINS $term OR n.qualifiedName CONTAINS $term OR n.expression CONTAINS $term)
RETURN labels(n)[0] AS label,
       COALESCE(n.name, n.qualifiedName, n.expression) AS name,
       COALESCE(n.fieldId, n.code) AS id
LIMIT 20
"""

GRAPH_NEIGHBORS = """
MATCH (n)-[r]-(neighbor)
WHERE n.fieldId=$fid OR n.name=$name
RETURN type(r) AS rel, labels(neighbor)[0] AS neighbor_type,
       COALESCE(neighbor.name, neighbor.qualifiedName, neighbor.expression) AS neighbor_name
LIMIT 50
"""
```

- [ ] **Step 2: Write lineage_graph_service.py**

```python
from app.db import get_session
from app.graph.cypher_queries import (
    FIELD_XSLT_DRILLDOWN, FIELD_VARIABLES, FIELD_JAVA_DRILLDOWN,
    FIELD_DOWNSTREAM_GRAPH, FIELD_IMPACT
)

def get_xslt_drilldown(field_id: int) -> dict:
    with get_session() as s:
        result = s.run(FIELD_XSLT_DRILLDOWN, fid=field_id)
        row = result.single()
    if not row:
        return {"file": None, "template": None, "variables": [], "xpaths": []}
    return {"file": row["file"], "template": row["template"],
            "variables": row["variables"], "xpaths": row["xpaths"]}

def get_field_variables(field_id: int) -> list:
    with get_session() as s:
        result = s.run(FIELD_VARIABLES, fid=field_id)
        return [{"name": r["name"], "type": r["type"],
                 "depends_on": r["depends_on"], "xpaths": r["xpaths"]}
                for r in result]

def get_java_drilldown(field_id: int) -> list:
    with get_session() as s:
        result = s.run(FIELD_JAVA_DRILLDOWN, fid=field_id)
        return [{"class_name": r["class_name"], "method": r["method"],
                 "method_name": r["method_name"], "calls": r["calls"]}
                for r in result]

def get_downstream_graph(field_id: int) -> list:
    with get_session() as s:
        result = s.run(FIELD_DOWNSTREAM_GRAPH, fid=field_id)
        return [{"code": r["code"], "name": r["name"], "type": r["type"]} for r in result]

def get_field_impact(field_id: int) -> list:
    with get_session() as s:
        result = s.run(FIELD_IMPACT, fid=field_id)
        return [{"node_type": r["node_type"], "node_name": r["node_name"]} for r in result]
```

- [ ] **Step 3: Write lineage_routes.py**

```python
from fastapi import APIRouter, HTTPException
from app.graph.lineage_graph_service import (
    get_xslt_drilldown, get_field_variables, get_java_drilldown,
    get_downstream_graph, get_field_impact
)
from app.core.response import ApiResponse

router = APIRouter(tags=["lineage"])

@router.get("/fields/{field_id}/xslt-drilldown")
def xslt_drilldown(field_id: int):
    return ApiResponse(success=True, data=get_xslt_drilldown(field_id))

@router.get("/fields/{field_id}/xslt/variables")
def xslt_variables(field_id: int):
    return ApiResponse(success=True, data=get_field_variables(field_id))

@router.get("/fields/{field_id}/java-drilldown")
def java_drilldown(field_id: int):
    return ApiResponse(success=True, data=get_java_drilldown(field_id))

@router.get("/fields/{field_id}/downstream/systems")
def downstream_systems(field_id: int):
    return ApiResponse(success=True, data=get_downstream_graph(field_id))

@router.get("/fields/{field_id}/impact-analysis")
def field_impact(field_id: int):
    return ApiResponse(success=True, data=get_field_impact(field_id))
```

- [ ] **Step 4: Test**

```bash
curl "http://localhost:8000/api/fields/1/xslt-drilldown"
curl "http://localhost:8000/api/fields/1/java-drilldown"
curl "http://localhost:8000/api/fields/1/downstream/systems"
```

Expected: XSLT template + variables for EVENT_TIMESTAMP field.

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/graph/ lineage-backend/app/api/routes/lineage_routes.py
git commit -m "feat: XSLT + Java + downstream lineage routes via Neo4j Cypher"
```

---

## Task 11: Search + Graph Explorer + Comparison + Impact Routes

**Files:**
- Create: `lineage-backend/app/graph/graph_search_service.py`
- Create: `lineage-backend/app/graph/impact_graph_service.py`
- Create: `lineage-backend/app/graph/comparison_graph_service.py`
- Modify: `lineage-backend/app/api/routes/search_routes.py`
- Modify: `lineage-backend/app/api/routes/graph_routes.py`
- Modify: `lineage-backend/app/api/routes/impact_routes.py`
- Modify: `lineage-backend/app/api/routes/comparison_routes.py`

- [ ] **Step 1: Write graph_search_service.py**

```python
from app.db import get_session, get_connection
from app.graph.cypher_queries import GRAPH_SEARCH, GRAPH_NEIGHBORS
from sqlalchemy import text

def search_graph(term: str) -> list:
    with get_session() as s:
        result = s.run(GRAPH_SEARCH, term=term)
        return [{"label": r["label"], "name": r["name"], "id": r["id"]} for r in result]

def get_graph_neighbors(field_id: int) -> list:
    with get_session() as s:
        result = s.run(GRAPH_NEIGHBORS, fid=field_id, name="")
        return [{"rel": r["rel"], "neighbor_type": r["neighbor_type"],
                 "neighbor_name": r["neighbor_name"]} for r in result]

def get_field_subgraph(field_id: int, depth: int = 2) -> dict:
    with get_session() as s:
        result = s.run("""
            MATCH (f:Field {fieldId: $fid})
            OPTIONAL MATCH (f)-[r1]->(n1)
            OPTIONAL MATCH (n1)-[r2]->(n2)
            RETURN f, r1, n1, r2, n2 LIMIT 100
        """, fid=field_id)
        nodes, edges = [], []
        seen_nodes, seen_edges = set(), set()
        for row in result:
            for node_key in ["f", "n1", "n2"]:
                n = row.get(node_key)
                if n:
                    nid = list(n.id if hasattr(n, "id") else [str(dict(n))])[0] if hasattr(n, "id") else str(id(n))
                    nid = str(dict(n).get("fieldId") or dict(n).get("name") or dict(n).get("qualifiedName", ""))
                    if nid and nid not in seen_nodes:
                        seen_nodes.add(nid)
                        props = dict(n)
                        label = list(n.labels)[0] if hasattr(n, "labels") else "Node"
                        nodes.append({"id": nid, "label": label, "properties": props})
            for rel_key in ["r1", "r2"]:
                r = row.get(rel_key)
                if r and hasattr(r, "type"):
                    eid = str(r.element_id) if hasattr(r, "element_id") else str(id(r))
                    if eid not in seen_edges:
                        seen_edges.add(eid)
                        edges.append({"type": r.type})
    return {"nodes": nodes, "edges": edges}
```

- [ ] **Step 2: Write search_routes.py**

```python
from fastapi import APIRouter, Query
from app.db import get_connection
from app.graph.graph_search_service import search_graph
from app.core.response import ApiResponse
from sqlalchemy import text

router = APIRouter(prefix="/search", tags=["search"])

@router.get("/global")
def global_search(q: str = Query(..., min_length=2)):
    with get_connection() as conn:
        rows = conn.execute(text("""
            SELECT TOP 20 rf.FIELD_ID, rf.INTERNAL_FIELD_NAME, rf.BUSINESS_NAME,
                   rf.CRITICALITY, j.JURISDICTION_CODE, 'FIELD' as result_type
            FROM REGULATORY_FIELDS rf
            JOIN JURISDICTIONS j ON j.JURISDICTION_ID=rf.JURISDICTION_ID
            WHERE rf.INTERNAL_FIELD_NAME LIKE :q OR rf.BUSINESS_NAME LIKE :q
        """), {"q": f"%{q}%"}).fetchall()
        db_results = [{"field_id":r[0],"field_name":r[1],"business_name":r[2],
                       "criticality":r[3],"jurisdiction":r[4],"result_type":r[5]} for r in rows]
    graph_results = search_graph(q)
    return ApiResponse(success=True, data={"fields": db_results, "graph_nodes": graph_results,
                                            "total": len(db_results) + len(graph_results)})

@router.get("/suggestions")
def search_suggestions(q: str = Query(..., min_length=1)):
    with get_connection() as conn:
        rows = conn.execute(text("""
            SELECT TOP 10 INTERNAL_FIELD_NAME FROM REGULATORY_FIELDS
            WHERE INTERNAL_FIELD_NAME LIKE :q ORDER BY INTERNAL_FIELD_NAME
        """), {"q": f"%{q}%"}).fetchall()
    return ApiResponse(success=True, data=[r[0] for r in rows])
```

- [ ] **Step 3: Write graph_routes.py**

```python
from fastapi import APIRouter
from pydantic import BaseModel
from app.graph.graph_search_service import search_graph, get_graph_neighbors, get_field_subgraph
from app.core.response import ApiResponse

router = APIRouter(prefix="/graph", tags=["graph"])

class GraphSearchRequest(BaseModel):
    term: str
    node_types: list[str] = []

class SubgraphRequest(BaseModel):
    field_id: int
    depth: int = 2

@router.post("/search")
def graph_search(req: GraphSearchRequest):
    return ApiResponse(success=True, data=search_graph(req.term))

@router.get("/neighbors/{field_id}")
def graph_neighbors(field_id: int):
    return ApiResponse(success=True, data=get_graph_neighbors(field_id))

@router.post("/subgraph")
def graph_subgraph(req: SubgraphRequest):
    return ApiResponse(success=True, data=get_field_subgraph(req.field_id, req.depth))
```

- [ ] **Step 4: Write comparison_routes.py**

```python
from fastapi import APIRouter
from pydantic import BaseModel
from app.db import get_connection
from app.core.response import ApiResponse
from sqlalchemy import text

router = APIRouter(prefix="/comparison", tags=["comparison"])

class ComparisonRequest(BaseModel):
    field_ids: list[int]

@router.post("/fields")
def compare_fields(req: ComparisonRequest):
    results = []
    with get_connection() as conn:
        for fid in req.field_ids[:4]:
            row = conn.execute(text("""
                SELECT rf.FIELD_ID, rf.INTERNAL_FIELD_NAME, rf.BUSINESS_NAME,
                       rf.DATA_TYPE, rf.CRITICALITY, rf.SOURCE_TYPE, rf.STATUS,
                       j.JURISDICTION_CODE,
                       fi.BUSINESS_TRANSLATION, fi.TECHNICAL_INTERPRETATION
                FROM REGULATORY_FIELDS rf
                JOIN JURISDICTIONS j ON j.JURISDICTION_ID=rf.JURISDICTION_ID
                LEFT JOIN FIELD_INTERPRETATIONS fi ON fi.FIELD_ID=rf.FIELD_ID
                WHERE rf.FIELD_ID=:fid
            """), {"fid": fid}).fetchone()
            if row:
                results.append({
                    "field_id":row[0],"field_name":row[1],"business_name":row[2],
                    "data_type":row[3],"criticality":row[4],"source_type":row[5],
                    "status":row[6],"jurisdiction":row[7],
                    "business_translation":row[8],"technical_interpretation":row[9],
                })
    return ApiResponse(success=True, data={"fields": results, "comparison_count": len(results)})

@router.post("/business")
def compare_business(req: ComparisonRequest):
    return compare_fields(req)
```

- [ ] **Step 5: Write impact_routes.py**

```python
from fastapi import APIRouter
from pydantic import BaseModel
from app.graph.lineage_graph_service import get_field_impact
from app.db import get_connection
from app.core.response import ApiResponse
from sqlalchemy import text

router = APIRouter(prefix="/impact-analysis", tags=["impact"])

class ImpactRunRequest(BaseModel):
    field_id: int
    change_type: str = "SCHEMA_CHANGE"

@router.post("/run")
def run_impact(req: ImpactRunRequest):
    impacted = get_field_impact(req.field_id)
    with get_connection() as conn:
        down = conn.execute(text("""
            SELECT DOWNSTREAM_NAME, DOWNSTREAM_TYPE, CRITICALITY
            FROM FIELD_DOWNSTREAM_MAPPINGS WHERE FIELD_ID=:fid
        """), {"fid": req.field_id}).fetchall()
    downstream = [{"name":r[0],"type":r[1],"criticality":r[2]} for r in down]
    return ApiResponse(success=True, data={
        "field_id": req.field_id,
        "change_type": req.change_type,
        "impacted_nodes": impacted,
        "impacted_downstream": downstream,
        "total_impact_count": len(impacted) + len(downstream),
    })
```

- [ ] **Step 6: Test all new routes**

```bash
curl "http://localhost:8000/api/search/global?q=EVENT"
curl -X POST http://localhost:8000/api/comparison/fields \
  -H "Content-Type: application/json" -d '{"field_ids":[1,11]}'
curl -X POST http://localhost:8000/api/impact-analysis/run \
  -H "Content-Type: application/json" -d '{"field_id":1}'
curl -X POST http://localhost:8000/api/graph/search \
  -H "Content-Type: application/json" -d '{"term":"EVENT_TIMESTAMP"}'
```

Expected: real results from MSSQL + Neo4j.

- [ ] **Step 7: Commit**

```bash
git add lineage-backend/app/graph/ lineage-backend/app/api/routes/
git commit -m "feat: search, graph explorer, comparison, and impact routes"
```

---

## Task 12: Export Routes + Final Wiring

**Files:**
- Modify: `lineage-backend/app/api/routes/export_routes.py`
- Modify: `lineage-backend/app/api/router.py`

- [ ] **Step 1: Write export_routes.py**

```python
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import csv, io
from app.db import get_connection
from sqlalchemy import text

router = APIRouter(prefix="/export", tags=["export"])

class ExportFieldsRequest(BaseModel):
    jurisdiction: str = None
    criticality: str = None
    format: str = "csv"

@router.post("/fields")
def export_fields(req: ExportFieldsRequest):
    where = ["rf.STATUS='ACTIVE'"]
    params = {}
    if req.jurisdiction:
        where.append("j.JURISDICTION_CODE=:jcode")
        params["jcode"] = req.jurisdiction
    if req.criticality:
        where.append("rf.CRITICALITY=:crit")
        params["crit"] = req.criticality
    with get_connection() as conn:
        rows = conn.execute(text(f"""
            SELECT rf.INTERNAL_FIELD_NAME, rf.BUSINESS_NAME, rf.DATA_TYPE,
                   rf.CRITICALITY, rf.SOURCE_TYPE, rf.STATUS, j.JURISDICTION_CODE
            FROM REGULATORY_FIELDS rf
            JOIN JURISDICTIONS j ON j.JURISDICTION_ID=rf.JURISDICTION_ID
            WHERE {' AND '.join(where)} ORDER BY j.JURISDICTION_CODE, rf.INTERNAL_FIELD_NAME
        """), params).fetchall()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Field Name","Business Name","Data Type","Criticality","Source Type","Status","Jurisdiction"])
    for r in rows:
        writer.writerow(list(r))
    output.seek(0)
    return StreamingResponse(output, media_type="text/csv",
                             headers={"Content-Disposition": "attachment; filename=fields.csv"})
```

- [ ] **Step 2: Verify router.py includes all route modules**

```python
# lineage-backend/app/api/router.py
from fastapi import APIRouter
from app.api.routes import (
    health_routes, auth_routes, lookup_routes, field_routes,
    lineage_routes, impact_routes, comparison_routes, graph_routes,
    jurisdiction_routes, export_routes, dashboard_routes, search_routes,
)

router = APIRouter()
router.include_router(health_routes.router)
router.include_router(lookup_routes.router)
router.include_router(dashboard_routes.router)
router.include_router(jurisdiction_routes.router)
router.include_router(field_routes.router)
router.include_router(lineage_routes.router)
router.include_router(impact_routes.router)
router.include_router(comparison_routes.router)
router.include_router(graph_routes.router)
router.include_router(search_routes.router)
router.include_router(export_routes.router)
```

- [ ] **Step 3: Full backend test**

```bash
uvicorn app.main:app --reload --port 8000
curl http://localhost:8000/api/health/dependencies
# Expected: {"success":true,"data":{"mssql":"ok","neo4j":"ok","overall":"ok"}}
curl http://localhost:8000/api/dashboard/summary
# Expected: total_fields=60, total_jurisdictions=6
```

- [ ] **Step 4: Final commit**

```bash
git add lineage-backend/
git commit -m "feat: complete backend — all routes wired with real MSSQL + Neo4j data"
```

---

## Self-Review Checklist

- [x] All four named seed methods implemented: `add_jurisdiction`, `add_field_information`, `add_business_concept_to_neo4j`, `add_field_graph_to_neo4j`
- [x] 6 jurisdictions × 10 fields = 60 fields minimum
- [x] EVENT_TIMESTAMP has 5 variables, 3 XPaths, 3 Java methods, 4 downstream
- [x] MSSQL DDL uses UPPERCASE table + column names
- [x] No PUT/PATCH/DELETE routes
- [x] Response envelope on all routes
- [x] Server-side pagination on list endpoints
- [x] Neo4j constraints in 001_constraints.cypher
- [x] Auth skipped per decision
- [x] docker-compose.yml covers both MSSQL and Neo4j
