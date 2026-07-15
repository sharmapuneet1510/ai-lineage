# CLAUDE.md — Durable project knowledge

## What this repo is
Two independent projects under `ai-lineage/`:
- `lineage-backend/` — FastAPI + MSSQL + Neo4j (approved "Data Lineage Platform", May 2026).
- `lineage-frontend/` — React 18 + Vite + TypeScript + TanStack Query + React Router.

`CLAUDE_INSTRUCTIONS.md` holds the operating model + product vision. `requirements.txt` is the
current concrete deliverable: the **Advanced Enterprise Investigation UI** (Phase 21).
`tasklist.md` tracks phased progress.

## Key architectural decisions
- **Do not rewrite the whole app** (CLAUDE_INSTRUCTIONS §17). The premium UI is *added* to the
  existing frontend, not a rebuild.
- The investigation UI is **self-contained / mock-testable** (§6, §15): it reads all data through
  `src/investigation/dataClient.ts`, selected by `VITE_DATA_MODE` (`mock` default | `api`). Mock
  mode needs no MSSQL/Neo4j, so the UI is fully demonstrable and testable offline.
- **No project-specific hardcoding** (§5): the mock domain is a generic order-processing pipeline;
  no regulatory concepts.
- **Provenance is the signature**: every conclusion carries a `Provenance` trust label
  (parsed / derived / ai / inferred / user / verified). See `src/investigation/ui.tsx` `TrustLabel`.

## Investigation module map (`src/investigation/`)
- `types.ts` — domain model (Field, Evidence, DecisionNode, JourneyStage, Feedback, ReviewEvent).
- `fixtures.ts` — rich generic dataset; flagship field `effective_unit_price` has full trace.
- `dataClient.ts` — `dataClient` (mock+api) + grounded mock LLM (`ask`). Backend integration point.
- `InvestigationWorkspace.tsx` — 3-panel orchestrator; route `/investigate/:fieldId` (full-bleed,
  outside `AppLayout`; wired in `App.tsx`).
- `FieldSidebar.tsx`, `EvidenceRail.tsx` (evidence inspector + AI assistant), `Tabs.tsx`,
  `DecisionTree.tsx`, `DataJourney.tsx`, `CommandPalette.tsx` (Cmd/Ctrl+K), `ui.tsx` (TrustLabel,
  CodeBlock w/ dependency-free highlighting, Card), `investigation.css` (all styles + dark/light).

## Commands (run from `lineage-frontend/`)
- Typecheck: `npx tsc --noEmit`
- Build: `npx vite build`
- Dev: `npx vite` (visit `/investigate`)
- Tests: `package.json` declares `vitest` but it is **not installed** — test harness needs wiring.

## Parsing subsystem (`lineage-backend/app/parsing/`)
- **Parsers emit facts, not lineage.** A `Fact` is something a parser literally saw
  (`assignment`, `element`, `template_match`). Deriving field lineage from facts is the
  tracing stage's job (Phase 3/4). This is what makes cross-language traces possible —
  no single parser sees both sides of a Java → XSLT → XSD hop.
- **Provenance is mandatory** on every `Fact` and `ParseIssue` (Rule 3).
- **No LLM client may be imported under `app/parsing/`** (Rule 1). Enforced by
  `tests/parsing/test_rules.py`, not by convention.
- **A parse failure is data, not an exception.** Malformed files yield a `ParseIssue` and
  the run continues, so the gap is visible and attributable in the UI instead of looking
  like a field with no lineage. Verify this holds for the *whole* function, not just the
  line a reviewer flagged — the walker needed three review rounds to close every raise
  path (unguarded `read_bytes`, then `is_file()`, then `glob()` iteration).
- **XML-family parsers (xml, and future xsd/xslt) must refuse any document declaring a
  DTD.** libxml2 substitutes entities in attribute values below the `resolve_entities`
  layer, leaving no `Entity` node to detect post-parse — a tree scan alone would miss it
  and silently emit fabricated data as a real fact. Refuse the DTD outright; don't try to
  enumerate entity-use sites.
- `FactSink` is the seam: `JsonlFactSink` today, the Neo4j/MSSQL graph writer later, with
  no parser changes.
- Config is sources-and-bindings only (`parse.config.example.yaml`), never a DSL.
- Run: `python scripts/run_parse.py --config parse.config.yaml`. Emits `facts.jsonl`,
  `fields.json`, `evidence.idx`, `run_summary.json`.
- `fields.json` is **empty until Phase 3** — no parser emits `field_decl` facts yet. This is
  correct, not a bug; do not fabricate `field_decl` facts to populate it early.
- Adding a parser: create the module, `@register` it, and **import it in
  `scripts/run_parse.py`** — registration happens by import side effect, so an unimported
  parser is an unregistered parser and dies with an unknown-type error at run time.
- Semantic search is optional and defaults to off. Anthropic has **no embeddings endpoint**
  (their docs point to Voyage AI), so a hosted embedder would be a second mandatory external
  service, which CLAUDE_INSTRUCTIONS §2 forbids. `embedder.py` is a port: null default,
  local open-weight model, optional hosted adapter. ML libs are an optional extra, never in
  `requirements.txt`.
- Guide: `docs/PARSERS.md`. Spec: `docs/superpowers/specs/2026-07-14-parser-foundation-design.md`.

## Known limitations / next
- Phase E3 (dashboard hotspots, multi-field comparison) not built; focus mode is done.
- No automated component tests yet (vitest + testing-library not in devDependencies).
- Backend `/api` endpoints for feedback/activity/chat referenced by `apiClient` don't exist yet;
  only mock mode is exercised.
