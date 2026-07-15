# Lineage Inspector — static viewer

A single self-contained HTML page that reads the parser's output and renders a
provenance-first field tracer: a field/subject sidebar, a graph-first lineage
view (upstream → field → downstream, colored by source language, with dashed
amber nodes where a value has no producing fact), an evidence inspector, the
parse gaps, and the run summary.

No build step, no framework, no backend, no database. The page reads the
parser's JSON output **directly** from a folder next to it.

## Use it

1. Run the parser, writing its output into a `data/` folder beside the page:

   ```bash
   cd ../lineage-backend
   python3 scripts/run_parse.py --config parse.config.yaml --out ../lineage-viewer/data
   ```

   That writes `facts.jsonl`, `evidence.idx`, `fields.json`, and
   `run_summary.json` into `lineage-viewer/data/`.

2. Serve the `lineage-viewer/` folder with any static file server and open it:

   ```bash
   cd ../lineage-viewer
   python3 -m http.server 8080
   # → http://localhost:8080/
   ```

   The page fetches `./data/evidence.idx` (or `./data/facts.jsonl`),
   `./data/fields.json`, and `./data/run_summary.json` on load. Host that folder
   anywhere that serves static files and the viewer works.

## Load data without a server

Opened from `file://`, a browser blocks the `fetch`, so the page falls back to a
built-in **sample dataset** and shows a banner. To inspect your own data in that
case, use **Load parse output** (top right) or drag your `facts.jsonl` /
`evidence.idx` / `fields.json` onto the window.

## What it reads

| File | Used for |
|---|---|
| `evidence.idx` | Facts + the token index (fastest single source). Preferred. |
| `facts.jsonl` | Facts and parse issues, one JSON record per line. Used if no `evidence.idx`. |
| `fields.json` | The discovered-field list for the sidebar. Empty until parser Phase 3 emits `field_decl` facts — the viewer falls back to grouping observed subjects. |
| `run_summary.json` | Files parsed, facts by kind, duration. |

Everything shown is a fact a parser literally observed — nothing is inferred. A
value that is read downstream but has no producing fact is drawn as an explicit
**gap**, not guessed at.

## Notes

- `data/` is git-ignored — it's your parse output, not part of the repo.
- Semantic (vector) search isn't wired in yet: the parser doesn't emit an
  embeddings artifact today, and keeping "the UI reads a file directly" true
  means shipping vectors as JSON for in-browser similarity. That slots in when
  the embedder is wired into a run. Keyword/structural search over symbols,
  files, XPaths, and field names works now.
- Only the XML parser exists today, so real lineage is currently structural
  (elements, attributes, XPaths). The dataflow graph (reads → field → writes)
  lights up fully once the Java/XSLT/XSD parsers land — the sample dataset shows
  what that looks like.
