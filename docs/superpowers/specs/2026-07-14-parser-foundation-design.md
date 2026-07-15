# Parser Foundation — Design Spec

**Date:** 2026-07-14
**Status:** Approved design, ready for implementation planning
**Scope:** Sub-project #1 of 6 (see Decomposition below)

---

## 1. Why this exists

`CLAUDE_INSTRUCTIONS.md` Phase 1 requires deterministic parsers for Java, XSLT, XSD, XML, and
supporting documents, feeding a field-level lineage graph. None of it exists today: `lineage-backend`
has FastAPI routes, services, repositories, MSSQL DDL, and Neo4j constraints, but no parsing package,
no parser config, and no ingestion pipeline. `requirements.txt` lists no parsing libraries.

The graph model already anticipates parsers — `db/neo4j/001_constraints.cypher` declares `JavaClass`,
`JavaMethod`, `XsltFile`, `XsltTemplate`, `XsltVariable`, `XPath`, and `Field` — so parsers have a
defined target. What is missing is everything that produces the data.

This spec covers the **foundation** that all five parsers depend on: the config engine, the parser
contract, the fact model, the sink abstraction, the run lifecycle, and the searchable indexes.

## 2. Decomposition

This work is six independent sub-projects. Each gets its own spec → plan → implementation cycle.

| # | Sub-project | Depends on | Status |
|---|---|---|---|
| 1 | **Parser foundation** (config, Parser contract, Fact model, sinks, runner, indexes, XML reference parser) | — | **This spec** |
| 2 | Graph writers (Fact → Neo4j/MSSQL) | #1 | Not started |
| 3 | XSD + XSLT parsers | #1 | Not started |
| 4 | Java parser (AST, conditions, assignments, calls, multi-module) | #1 | Not started |
| 5 | Document parser | #1 | Not started |
| 6 | Runtime LLM grounding pack | #1, #2 | Not started |

The **developer-facing parser guide** is written alongside #1, not deferred to Phase 20 — sub-project
#3 needs it on day one.

## 3. Non-negotiable rules this design encodes

- **Rule 1 — deterministic parsing establishes facts.** Nothing in `app/parsing/` imports an LLM
  client. This is enforced structurally, not by convention.
- **Rule 3 — every conclusion carries provenance.** `Provenance` is a required, non-optional field on
  every `Fact` and every `ParseIssue`.
- **Rule 5 — no project-specific hardcoding.** All source locations, module names, and parser bindings
  come from config. No domain concept is compiled into the package.
- **No mandatory external services except the user-provided LLM API.** Semantic search is optional and
  defaults to a local open-weight embedder; full-text search always works with no embedder configured.

## 4. Architecture

### 4.1 Parsers emit facts, not lineage

A parser emits **source-faithful atomic facts** — things it literally saw. It does **not** decide what
a field is or where lineage flows. A later tracing stage (Phase 3/4) walks the facts to derive
field-to-field lineage.

This keeps the hard logic (resolving references across modules and languages) in one place instead of
duplicating it across five parsers, and it is the only way a cross-language trace
(Java → XSLT → XSD) is possible: no single parser ever sees both sides of such a hop.

```
Java parser sees:   price = base * (1 - discount);

Emits a FACT:       Assignment(subject="price", reads=[base, discount], writes=[price],
                               attrs={expr: "base*(1-discount)"},
                               provenance={file: Pricer.java, symbol: Pricer.calc,
                                           lines: 41-41, source_hash: ab12…})

It does NOT emit:   "effective_unit_price derives from base_price"   ← that's tracing's job
```

### 4.2 Module layout

```
lineage-backend/app/parsing/
  facts.py       # Fact, Provenance, ParseIssue, Severity
  config.py      # ParseConfig pydantic schema + loader + validator
  registry.py    # parser type string -> Parser class
  walker.py      # module + globs -> file list; encoding, source hashing
  sinks.py       # FactSink protocol; JsonlFactSink, InMemoryFactSink
  runner.py      # config -> walk -> dispatch -> sink -> RunSummary
  index.py       # facts -> fields.json + evidence.idx
  embedder.py    # Embedder port; LocalEmbedder (default), HostedEmbedder (optional)
  parsers/
    base.py      # Parser protocol
    xml.py       # reference parser — proves the contract end to end
lineage-backend/scripts/run_parse.py   # CLI entrypoint
```

Parsing is offline ingestion, so it gets a CLI entrypoint, not an API route.

### 4.3 The Fact model

```python
class Severity(str, Enum):
    WARNING = "warning"   # parsed, but something was skipped
    ERROR   = "error"     # file did not parse; run continues
    FATAL   = "fatal"     # run cannot proceed; aborts

class Provenance(BaseModel):
    module: str
    file: str                        # module-relative — (module, file) together identify the file
    source_hash: str                 # sha256 of the file's bytes
    line_start: int | None = None
    line_end: int | None = None
    symbol: str | None = None        # FQ class/method, XSLT template, XSD element
    xpath: str | None = None
    parser: str                      # "xml" | "java" | ...
    parser_version: str
    parsed_at: datetime

class Fact(BaseModel):
    kind: str                        # discriminator, owned by the emitting parser
    subject: str                     # what the fact is about
    reads: list[str] = []            # inputs observed
    writes: list[str] = []           # outputs observed
    attrs: dict[str, str | int | bool | None] = {}   # kind-specific payload
    provenance: Provenance

class ParseIssue(BaseModel):
    severity: Severity
    parser: str
    file: str
    message: str
    provenance: Provenance | None = None
```

**Why `kind` + `attrs` is open rather than a closed set of typed fact classes:** XSD, XSLT, and Java
each need their own payload shape. An open discriminator lets the foundation ship *before* the Java
parser exists, and lets each later parser add its vocabulary additively without touching core code.
Each parser owns and documents the fact kinds it emits.

### 4.4 The Parser contract

```python
class Parser(Protocol):
    type: ClassVar[str]              # matches the config `type:` binding
    version: ClassVar[str]           # recorded in every fact's provenance

    def parse(
        self, source: str, base: Provenance
    ) -> Iterator[Fact | ParseIssue]: ...
```

Parsers know nothing about config, sinks, databases, or each other. They receive decoded source text
and a partially-filled `Provenance` (module, file, source_hash, parser, parser_version, parsed_at
already set) and yield facts and issues. That is the entire surface — which is what makes each one
independently testable, and what will let the Java parser be built without touching anything else.

### 4.5 Sinks

Parsers never touch a database.

```python
class FactSink(Protocol):
    def emit(self, item: Fact | ParseIssue) -> None: ...
    def close(self) -> None: ...
```

Shipping now: `JsonlFactSink` (one JSON object per line, on disk — replayable and diffable between
runs) and `InMemoryFactSink` (tests). Sub-project #2's graph writer becomes just another `FactSink`
implementation, with no parser changes and no retrofitted seam.

The whole subsystem therefore runs with **zero infrastructure** — no MSSQL, no Neo4j — mirroring how
the frontend already runs offline in mock mode.

## 5. Configuration reference

Config declares **what** to parse and **with which** parser. Extraction logic stays in code; the
config is not a DSL. This satisfies Rule 5 without requiring us to design, validate, debug, and
document a rule language.

### 5.1 Full example

```yaml
version: 1

modules:
  - name: pricing-core
    root: ./src/pricing
    parsers:
      - type: java
        include: ["**/*.java"]
        exclude: ["**/test/**", "**/generated/**"]
      - type: xslt
        include: ["**/*.xsl", "**/*.xslt"]

  - name: order-intake
    root: ./src/intake
    parsers:
      - type: xml
        include: ["**/*.xml"]

xsd_stores:
  - name: outbound
    root: ./schemas/out
    include: ["**/*.xsd"]

options:
  encoding: utf-8
  fail_on: never
  output_dir: ./out
```

### 5.2 Field reference

**Top level**

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `version` | int | yes | — | Config schema version. Currently `1`. Lets the schema evolve without breaking existing files. |
| `modules` | list | yes | — | Source modules to parse. At least one required. |
| `xsd_stores` | list | no | `[]` | XSD schema locations. Separate from `modules` because a store is shared across modules rather than owned by one. |
| `options` | object | no | see below | Run-wide options. |

**`modules[]`**

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `name` | str | yes | — | Module identifier. Recorded in every fact's `provenance.module`. Must be unique. |
| `root` | path | yes | — | Directory the module's globs resolve against. Relative paths resolve against the config file's location. A missing root is a `fatal` issue. |
| `parsers` | list | yes | — | Parser bindings. At least one required. |

**`modules[].parsers[]`**

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `type` | str | yes | — | Parser to use. Must be a registered type (`xml` today; `java`, `xslt`, `xsd`, `document` as they land). An unknown type is a `fatal` config error, caught at load time. |
| `include` | list[glob] | yes | — | Globs, relative to `root`, of files this parser handles. |
| `exclude` | list[glob] | no | `[]` | Globs subtracted from `include`. Applied after `include`. |
| `options` | object | no | `{}` | Parser-specific options, passed through to the parser. Validated by the parser, not the core. |

**`xsd_stores[]`**

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `name` | str | yes | — | Store identifier. Must be unique. |
| `root` | path | yes | — | Directory containing the schemas. |
| `include` | list[glob] | no | `["**/*.xsd"]` | Globs relative to `root`. |

**`options`**

| Field | Type | Required | Default | Meaning |
|---|---|---|---|---|
| `encoding` | str | no | `utf-8` | Source file encoding. A file that fails to decode produces an `error` issue, not a crash. |
| `fail_on` | enum | no | `never` | `never` = record issues and continue (recommended). `error` = abort the run on the first `error`-severity issue. `fatal` issues always abort regardless. |
| `output_dir` | path | no | `./out` | Where run artifacts are written. |

### 5.3 Validation

`ParseConfig` is a pydantic model, so a malformed config fails at load time with a field-level error
rather than silently parsing nothing. Validated at load: required fields present, `version` supported,
every `parsers[].type` registered, module and store names unique, every `root` exists.

## 6. Usage

### 6.1 Run a parse

```bash
cd lineage-backend
python scripts/run_parse.py --config parse.config.yaml
```

(`python -m scripts.run_parse --config parse.config.yaml` also works — the script inserts the
`lineage-backend/` project root onto `sys.path` itself so both invocation styles resolve
`app.parsing...` imports correctly.)

Options:

| Flag | Default | Meaning |
|---|---|---|
| `--config PATH` | `parse.config.yaml` | Config file to load. |
| `--out DIR` | from config `options.output_dir` | Override the artifact directory. |
| `--module NAME` | all | Parse only the named module. Repeatable. Useful for iterating on one parser. |
| `--fail-on {never,error}` | from config | Override `options.fail_on`. |
| `-v` | off | Log every file as it is parsed. |

Exit code is `0` when the run completes (even with recorded `error` issues, under `fail_on: never`),
and non-zero on a `fatal` issue or when `fail_on: error` trips.

### 6.2 Artifacts a run produces

Written to `output_dir`:

| Artifact | What it is | Consumed by |
|---|---|---|
| `facts.jsonl` | The raw fact + issue stream, one JSON object per line. Replayable, diffable between runs. | Sub-project #2 (graph writers); debugging a bad trace. |
| `fields.json` | Field index: every discovered field with module, group, language path, fact count, status (`parsed` / `gap` / `verified`). | The sidebar. |
| `evidence.idx` | Inverted index: symbol / file path / XPath / expression → fields whose lineage touches it. | Search (⌘K). |
| `run_summary.json` | Files parsed, facts by kind, issues by severity, wall time. | The run-summary screen; CI. |

### 6.3 Reading the summary

```
$ python scripts/run_parse.py --config parse.config.yaml

  312 files parsed · 4,881 facts · 47 fields
  3 errors · 11 warnings

  error   Rounding.java — UnicodeDecodeError at byte 0x9f
          → field `rounded_total` has no lineage past this file
  warning out.xsl — unsupported construct `xsl:function`, skipped
```

Every gap shown in the UI is traceable back to a line here. That is the point of recording issues as
first-class data rather than logging them.

## 7. Failure handling

A real codebase always contains files that will not parse — generated code, wrong encodings, malformed
XML. A parse failure becomes a **first-class `ParseIssue`** emitted to the sink alongside facts, and
the run continues.

Partial lineage beats no lineage — but *only* because the gap is recorded. An unparseable file becomes
a visible, attributable gap in the UI (the amber node in the lineage graph, the amber row in the
sidebar) rather than a field that silently appears to have no lineage. For an audit tool, a silent
gap is the worst possible failure mode.

`fail_on: error` exists for CI, where an all-or-nothing gate is sometimes wanted.

## 8. Search and the indexes

The sidebar lists **all discovered fields by default** (per `CLAUDE_INSTRUCTIONS.md` §2). Search covers
**fields and their evidence**: field names and metadata, plus the contents of the facts themselves —
symbols, file paths, XPaths, expressions. Searching `Pricer.calc` or `/Order/Price` lands on every
field whose lineage touches it. That is the difference between a sidebar that is a menu and one that
is an investigation tool.

### 8.1 Semantic search — the embedder port

Anthropic does **not** offer an embeddings endpoint; their documentation points to Voyage AI. Semantic
search therefore cannot ride on the user-provided LLM API, and a hosted embedding provider would be a
second mandatory external service — which §2 of `CLAUDE_INSTRUCTIONS.md` forbids.

Resolution: an `Embedder` **port** with two implementations.

| Implementation | Model | Default? | Notes |
|---|---|---|---|
| `LocalEmbedder` | `voyage-4-nano` (open-weight, Apache 2.0) | yes | Runs offline. No API key, no external service, no source code leaving the machine. |
| `HostedEmbedder` | `voyage-code-3` (hosted) | no | Opt-in via config. Notably better on a code corpus. Requires an API key and sends source fragments off-machine — an explicit user decision, never a default. |

**Full-text search works with no embedder configured.** Semantic search is strictly additive and
degrades gracefully, so a deployment that wants no ML dependency at all still has a fully functional
sidebar.

## 9. Testing

`lineage-backend` already has pytest and a `tests/` package, so the harness exists. (Contrast the
frontend, where `package.json` declares vitest but it is not installed.)

- **Unit tests per component** — config validation (valid, malformed, unknown parser type, duplicate
  module name, missing root); walker glob/exclude/hash behavior; sink round-trip; registry dispatch.
- **Golden-file tests for the XML parser** — fixture file in, expected fact list out, asserted against
  `InMemoryFactSink`. This is the pattern every later parser copies, which is most of why the reference
  parser is in scope here.
- **Failure test** — a deliberately malformed file produces a `ParseIssue` with the correct severity
  and provenance, and the run still completes with exit code 0 under `fail_on: never`.

No test touches MSSQL or Neo4j.

## 10. New dependencies

| Package | For | Notes |
|---|---|---|
| `pyyaml` | Config loading | Small, no transitive weight. |
| `lxml` | The XML reference parser | Also the basis for XSD and XSLT in sub-project #3. |

`pydantic` is already present. The embedder's ML dependencies (`torch` / `sentence-transformers`) are
an **optional extra**, not a base requirement — installing them is what turns semantic search on.

## 11. Out of scope

Graph writers (#2). The XSD, XSLT, Java, and document parsers (#3–#5). The runtime LLM grounding pack
(#6). Field tracing (Phase 4) — the stage that turns facts into lineage — is a separate concern that
consumes this output.

## 12. Open questions

None. All design decisions are settled:
facts over lineage edges; sources-and-bindings config (no DSL); `FactSink` with a JSONL default;
record-issue-and-continue failure semantics; graph-first default UI with trace/facts/explanation as
secondary tabs; full-text + evidence search with optional, locally-defaulted semantic search.
