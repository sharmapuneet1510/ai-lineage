# AI Lineage — User & Knowledge Guide

Everything you can do with this platform, how to do it, and what every file is.

---

## 1. What this is

A **data-lineage and field-documentation platform**. You point it at source code
(Camel routes, Java, XSLT, XSD), and it traces how each business field is produced
— across languages — with **evidence for every claim**, so the result holds up in
an audit.

It runs as a **file pipeline** in stages. **No database is required.**

```
   your source code
        │
        ▼
  ┌──────────┐   parse    deterministic, no AI
  │  PARSE   │  ───────▶  facts.jsonl, evidence.idx, fields.json, run_summary.json
  └──────────┘
        │
        ▼
  ┌──────────┐   trace    deterministic, no AI
  │  TRACE   │  ───────▶  lineage.json   (cross-language chains)
  └──────────┘
        │
        ▼
  ┌──────────┐   enrich   the AI stage, and only here
  │  ENRICH  │  ───────▶  fields.json    (business definitions, plain English)
  └──────────┘
        │
        ▼
   VIEWER (static web page) reads the JSON  ◀── you
        ▲
   FEEDBACK (optional API) — reviewers confirm / correct / verify
```

**The trust hierarchy** (the core idea): parsers establish **facts** (literally
read from source, never wrong); the LLM **explains** those facts (labeled, never
invents); humans **correct** the explanations (verified before reuse). Nothing
lower can silently overwrite the layer above, and every claim points back to its
evidence.

---

## 2. Quick start

```bash
# 1. install (from the repo root)
cd lineage-backend
python3 -m pip install -r requirements.txt        # lxml, pyyaml, javalang, anthropic, fastapi…

# 2. write a config (see §4) pointing at your source, e.g. parse.config.yaml

# 3. run the pipeline, writing output where the viewer reads it
python3 scripts/run_parse.py --config parse.config.yaml --out ../lineage-viewer/data
python3 scripts/run_trace.py --out ../lineage-viewer/data
python3 scripts/run_enrich.py --out ../lineage-viewer/data --stub     # --stub = offline, no API key

# 4. view it
cd ../lineage-viewer
python3 -m http.server 8080          # open http://localhost:8080/
```

For real AI-generated documentation (instead of `--stub`):
```bash
ANTHROPIC_API_KEY=sk-... python3 scripts/run_enrich.py --out ../lineage-viewer/data
```

---

## 3. The stages, in detail

### 3.1 Parse — source → facts

```bash
python3 scripts/run_parse.py --config parse.config.yaml [--out DIR] [--module NAME] [--fail-on never|error] [-v]
```

Reads the files your config names, dispatches each to the bound parser, and writes
**facts** — atomic records of what a parser literally saw. A file that won't parse
becomes a recorded *issue* (a visible gap), never a crash.

- `--out DIR` — where the artifacts go (default from config `output_dir`).
- `--module NAME` — parse only that module (repeatable).
- `--fail-on error` — abort on the first ERROR issue (for CI); default `never`.
- `-v` — log each file parsed.

**Produces:** `facts.jsonl`, `evidence.idx`, `fields.json` (empty here),
`run_summary.json`.

### 3.2 Trace — facts → cross-language lineage

```bash
python3 scripts/run_trace.py --out DIR [--target NAME] [--print]
```

Walks the facts into each field's backward lineage, resolving the joins no single
parser can make: dataflow / cross-language (`writes ∩ reads`), and the Camel
bean → Spring class → Java field-logic bridge. Marks language boundaries
(`crosses`) and gaps.

- `--target NAME` — trace only that name (repeatable). Default: every produced field.
- `--print` — also print the chains to the terminal.

**Produces:** `lineage.json` (one resolved chain per field).

### 3.3 Enrich — facts → AI-written documentation

```bash
python3 scripts/run_enrich.py --out DIR [--field NAME] [--stub] [--model claude-opus-4-8]
```

For each field, sends **only that field's facts** to the LLM with a strict
"explain, never invent" prompt, and writes the business definition + plain-English
summary into `fields.json`. A field with no producing fact (a gap) is never sent
to the model.

- `--stub` — offline placeholder generation, no API key (clearly labeled `[stub]`).
- `--field NAME` — enrich only that field (repeatable).
- `--model` — the Claude model (default `claude-opus-4-8`). Needs `ANTHROPIC_API_KEY`.

**Produces / updates:** `fields.json` — each generated entry carries a `generation`
provenance block (prompt id/version, model, evidence hashes). It never overwrites
the parsed facts.

### 3.4 View — read the JSON on screen

The viewer is a **single static HTML page** (`lineage-viewer/index.html`). Serve
the `lineage-viewer/` folder and it reads the JSON from `lineage-viewer/data/`:

```bash
cd lineage-viewer && python3 -m http.server 8080     # http://localhost:8080/
```

It also works via the **Load parse output** button or drag-and-drop if you open
it without a server. With no data it shows a labeled sample dataset.

### 3.5 Feedback — capture review (optional)

```bash
cd lineage-backend
FEEDBACK_STORE=../lineage-viewer/feedback_store.json \
  python3 -m uvicorn scripts.feedback_server:app --port 8000
```

Then open the viewer pointed at it (remembered after the first time):
```
http://localhost:8080/?api=http://localhost:8000/api
```

Each field gets a **Review & feedback** panel: submit feedback (confirm / correct /
flag-gap / note) and verify or reject entries. Feedback is a separate JSON layer —
it never overwrites parsed facts; only verified feedback is meant for reuse. No
database needed.

---

## 4. Configuration reference (`parse.config.yaml`)

You steer parsing with declarative config — **what** to parse, **with which**
parser. Extraction logic stays in code (it is not a DSL).

```yaml
version: 1

modules:                          # one or more source modules
  - name: pricing-core            # label; recorded on every fact's provenance.module
    root: ./services/pricing/src  # dir the globs resolve against (relative to this file)
    parsers:
      - type: java                # a registered parser type (see §5)
        include: ["**/*.java"]     # globs, relative to root
        exclude: ["**/test/**"]    # subtracted after include
      - type: camel-xml
        include: ["**/camel/*.xml", "**/*routes*.xml"]

  - name: transforms
    root: ./services/pricing/xslt
    parsers:
      - type: xslt
        include: ["**/*.xsl", "**/*.xslt"]

xsd_stores:                       # schema locations (shared across modules)
  - name: outbound
    root: ./schemas/out
    include: ["**/*.xsd"]

options:
  encoding: utf-8                 # source encoding (default utf-8)
  fail_on: never                  # never (record & continue) | error (abort on first error)
  output_dir: ./out               # where artifacts are written
```

Notes:
- **Multiple modules** are fully supported — just add entries. Facts are tagged
  with their module; cross-module lineage still works (the tracer joins on shared
  names, not module boundaries).
- A malformed config, a missing `root`, a duplicate name, or a bad glob pattern
  fails immediately with a clear `ConfigError`.
- An example lives at `lineage-backend/parse.config.example.yaml`.

---

## 5. Parsers — what each one does

Every parser emits the **same fact shape** (`kind`, `subject`, `reads`, `writes`,
`attrs`, `provenance`); only `kind`/`attrs` differ. That uniformity is why they can
be built independently yet join into one graph. All are DTD-refusing and never
raise (a bad file → a recorded issue).

| `type:` | File | Reads | Key fact kinds |
|---|---|---|---|
| `xml` | `parsers/xml.py` | any XML | `element`, `attribute` |
| `camel-xml` | `parsers/camel_xml.py` | Spring/Blueprint Camel route XML | `route_from`, `route_to`, `route_bean`, `bean_def` |
| `camel-yaml` | `parsers/camel_yaml.py` | Camel YAML routes | same as camel-xml |
| `java` | `parsers/java.py` | `.java` | `assignment`, `call` (field logic); `bean_def` (`@Component`/`@Service`/`@Bean`); `route_from`/`route_to`/`route_bean` (RouteBuilder DSL) |
| `xslt` | `parsers/xslt.py` | `.xsl`/`.xslt` | `template_match` (output ← input path) |
| `xsd` | `parsers/xsd.py` | `.xsd` | `element_decl` (name + type) |

**How the hops connect** (the tracer joins these automatically):
- Camel `route_bean` (`bean:pricer`) → `bean_def` (id → class) → Java facts of that
  class → the field logic.
- Java writes an output path (`/Order/Price`) → XSLT `template_match` reads it.
- XSLT writes an output field (`EffectiveUnitPrice`) → XSD `element_decl` declares it.

Full parser-author guide: **`docs/PARSERS.md`**.

---

## 6. Output files — what each contains

All land in the `--out` directory (e.g. `lineage-viewer/data/`).

| File | What it is | Produced by |
|---|---|---|
| `facts.jsonl` | one fact (or issue) per line; the source of truth, replayable/diffable | parse |
| `evidence.idx` | inverted search index (token → facts) + a copy of all facts | parse |
| `fields.json` | per-field docs (name, group, status, description, plain_english, generation) — **empty until enrich runs** | parse (empty) → enrich |
| `run_summary.json` | files parsed, facts by kind, issues by severity, duration | parse |
| `lineage.json` | resolved backward lineage chain per field (cross-language, bean-bridged, gap-marked) | trace |
| `feedback_store.json` | review feedback (separate layer) — git-ignored | feedback API |

The viewer reads `evidence.idx` (or `facts.jsonl`), `fields.json`, `run_summary.json`,
and `lineage.json`.

---

## 7. What you can do in the viewer

For any field (pick it in the left sidebar, grouped by module, searchable):

- **Business Definition / Plain English (WHAT/WHEN/WHY)** — AI-generated (from
  enrich); shows an honest "not generated yet" until you run enrich.
- **Downstream Systems** — where the field flows, as cards.
- **Technical Summary** — derived from the real facts.
- **Enrichment Pipeline / Linked Tickets / Schema Output Mappings** — collapsible.
- **Lineage Graph** — the cross-language trace from `lineage.json` (language
  badges, `file:line`, resolved bean→class, `⇄` boundary marks, amber gap nodes).
  Falls back to an in-browser graph if `lineage.json` is absent.
- **Evidence & Provenance** — the raw facts with their source stamps.
- **Review & Feedback** — submit/verify feedback (needs the feedback API, §3.5).
- **Search** (`/` or ⌘K) — over field names, symbols, files, and XPaths.
- **Theme toggle** — light / dark.

---

## 8. Feedback API reference

Base path `/api/feedback` (standalone server, or mounted in the main app).

| Method | Path | Does |
|---|---|---|
| `POST` | `/feedback` | create feedback `{field_id, kind, target, body, author}` (starts `unverified`) |
| `GET` | `/feedback?field_id=X` | list feedback for a field |
| `POST` | `/feedback/{id}/verify` | mark verified `{by}` |
| `POST` | `/feedback/{id}/reject` | mark rejected `{by}` |
| `GET` | `/feedback/summary` | counts by status |

`kind` ∈ confirm / correct / flag_gap / note. `target` ∈ definition / value /
lineage / downstream / general.

---

## 9. Repository map — what every important file is

```
lineage-backend/
  app/parsing/                 # the parse stage (deterministic; no LLM import allowed here)
    facts.py                   # Fact, Provenance, ParseIssue, Severity — the vocabulary
    config.py                  # ParseConfig schema + YAML loader + validation
    registry.py                # parser-type -> parser class
    walker.py                  # module + globs -> decoded, hashed source files
    sinks.py                   # FactSink (JSONL / in-memory) — where facts go
    runner.py                  # config -> walk -> dispatch -> sink -> RunSummary
    index.py                   # facts -> fields.json + evidence.idx
    embedder.py                # optional semantic-search port (null default)
    parsers/
      base.py                  # the Parser protocol
      _camel.py                # shared Camel fact vocabulary (XML+YAML+Java DSL)
      xml.py camel_xml.py camel_yaml.py java.py xslt.py xsd.py
  app/tracing/
    trace.py                   # facts -> lineage chains (cross-language, bean->class)
  app/enrich/                  # the AI stage
    llm.py                     # LLMClient (Anthropic / fake / stub)
    prompts.py                 # versioned prompt registry + grounded prompt builder
    models.py                  # FieldDoc + GenerationProvenance
    enrich.py                  # facts -> grounded FieldDoc (gap-safe)
  app/feedback/                # the review workflow
    models.py store.py routes.py
  scripts/
    run_parse.py               # CLI: parse
    run_trace.py               # CLI: trace
    run_enrich.py              # CLI: enrich
    feedback_server.py         # standalone feedback API (no DB)
  tests/parsing tests/tracing tests/enrich tests/feedback   # 183 offline tests
  parse.config.example.yaml    # copy this to start
  requirements.txt

lineage-viewer/
  index.html                   # the whole viewer — one self-contained file
  README.md                    # viewer usage
  data/                        # (git-ignored) your parse output goes here

docs/
  GUIDE.md                     # this file
  PARSERS.md                   # how to add a parser + fact-kind reference
  superpowers/specs/…          # parser-foundation design spec
  superpowers/plans/…          # implementation plan
```

---

## 10. Testing

```bash
cd lineage-backend
python3 -m pytest tests/parsing tests/tracing tests/enrich tests/feedback -q   # 183 pass, offline
```

Everything above runs with no database, no API key, no network.
`tests/test_impact.py`, `test_access.py`, `test_fields.py` are **pre-existing**
DB-dependent tests that fail without a live MSSQL/Neo4j — unrelated to the
lineage work.

---

## 11. Rules the platform enforces

- **Parsers emit facts, not lineage** — meaning is derived later, so cross-language
  traces are possible.
- **No LLM under `app/parsing/`** — parsing is deterministic; enforced by
  `tests/parsing/test_rules.py`.
- **Provenance on every fact** — file, line, symbol/xpath, source hash.
- **Failures are data** — a bad file → a recorded issue; an untraceable value → a
  marked gap; the LLM never fills a gap.
- **AI and feedback never overwrite facts** — they are separate, labeled layers.
- **No mandatory external service except the LLM API** — semantic search and the
  DB are optional.

---

## 12. What's built vs. what's next

**Built:** all six parsers (XML, Camel XML/YAML, Java field-logic + Spring beans +
RouteBuilder DSL, XSLT, XSD); the tracing stage; the enrich stage; the Field-360
viewer with the rendered cross-language trace; the feedback workflow. 183 tests.

**Next (roadmap, not defects):**
- Java method-call statements (removes the last synthetic serialization fact).
- Java conditions/branches (richer WHEN logic); XSLT `apply-templates` / named
  templates; multi-file Java type resolution.
- Graph writers (facts → Neo4j/MSSQL) for query at scale.
- Running against a real codebase and hardening the edge cases it surfaces.
```
