# Parser guide

How to add a parser to `lineage-backend/app/parsing/`.

This is written for someone with zero context on this codebase. Read it before
writing sub-project #3 (XSD/XSLT), #4 (Java), or #5 (documents). All four
should be structural copies of `app/parsing/parsers/xml.py`, the reference
implementation — read that file in full alongside this guide.

## The contract

A parser emits **facts** — things it literally saw in the source. It never
emits lineage ("field A derives from field B"); deriving lineage from facts
is the tracing stage's job (Phase 3/4). This is what makes cross-language
traces (Java → XSLT → XSD) possible: no single parser ever sees both sides of
a hop, so parsers can be added independently and in any order.

```python
class Parser(Protocol):
    type: ClassVar[str]     # matches the config `type:` binding
    version: ClassVar[str]  # recorded in every fact's provenance

    def parse(self, source: str, base: Provenance) -> Iterator[Fact | ParseIssue]: ...
```

`source` is already-decoded text (the walker read the file and decoded it —
your parser never touches the filesystem). `base` is a `Provenance` that
already has `module`, `file`, `source_hash`, `parser`, `parser_version`, and
`parsed_at` filled in; you copy it per-fact and add the location fields you
know.

## Rule 1: never raise

**A parser must never raise.** Malformed or hostile input yields a
`ParseIssue(severity=ERROR)` and the generator returns. A parse failure must
become a visible, attributable gap in the run output — never a crashed run,
and never a silent hole where a field's lineage should be.

This sounds simple and is not. The file walker that feeds parsers their
source text needed **three separate review rounds** to actually satisfy this
rule. Each round fixed the exact crash the reviewer pointed at and left
another one line away:

1. Round 1 fixed an unguarded `read_bytes()` call (permission error, broken
   symlink, file deleted between listing and reading — all raise).
2. Round 2 fixed an unguarded `is_file()` call (raises on some
   permission-denied / broken-symlink combinations depending on platform).
3. Round 3 fixed an unguarded `glob()` iterator (a directory that disappears
   mid-walk, or a permission-denied subdirectory, raises **while you are
   iterating it**, which a `try/except` wrapped around the call that produced
   the iterator does not catch).

The lesson: when you review your own parser (or the walker, or anything else
that touches untrusted input) for the never-raise rule, do not ask "does the
line I just fixed still raise?" Ask the invariant question instead: **"can
anything in this function raise, anywhere, for any input?"** Walk every I/O
call, every `.attrib[...]` / `[0]` / dict access that assumes a key exists,
every external-library call whose exception contract you have not actually
read. Assume adversarial or merely corrupt input, not just malformed-but-well-
intentioned input. Write a test for each failure mode you find, not just the
one that was reported.

## Security: never resolve DTDs or external entities (XML-family parsers)

The XML parser refuses **any** document that declares a DTD (`<!DOCTYPE ...>`),
whether or not that DTD declares entities. This is deliberately broader than
"reject documents with entities" and it is worth understanding exactly why,
because it is counter-intuitive and a future author — maybe you, on the XSD or
XSLT parser — will be tempted to relax it to "just strip/reject `<!ENTITY>`."
Don't.

`lxml`'s `resolve_entities=False` stops entities referenced from element or
tail **text** from being expanded — you get an `etree.Entity` node left in the
tree, which a post-parse tree scan can detect and reject. That is what this
codebase's *secondary*, defence-in-depth check does (`xml.py`, the
`entity_refs` scan).

But `libxml2` performs attribute-value normalization at a layer **below**
`resolve_entities`. An entity referenced inside an **attribute value** —
`<order id="&xxe;">` — is fully substituted into the attribute string during
parsing, before `resolve_entities` is ever consulted, and leaves **no**
`Entity` node anywhere in the resulting tree. A tree scan cannot see it
happened.

This bit us for real: an earlier version of this parser's test suite had
55 tests, all green, while it was silently emitting
`Fact(kind="attribute", value="PWNED")` (or worse, the contents of a local
file read via a `SYSTEM` entity) from an injected entity — indistinguishable
from real source data. Every entity test in that suite put the entity in
element *text*; none put one in an attribute value, so the gap went
undetected by the tests as well as by the code.

For an audit/lineage tool, a silently wrong fact is strictly worse than a
crash or a recorded `ParseIssue` — a crash is visible, a wrong fact looks
like ground truth to everyone downstream.

The fix is structural, not enumerative: **refuse the DTD, full stop.**
Legitimate business data files (orders, config, XSD, XSLT) have no need to
declare `<!DOCTYPE>`/`<!ENTITY>`. Don't try to enumerate every place an
entity can surface in a parsed tree — text, attributes, and whatever else a
future libxml2 version normalizes early — refuse the one thing all of those
paths depend on. **Any parser that touches XML-family input — this means the
XSD and XSLT parsers directly — must carry this same DTD refusal**, not just
the `resolve_entities=False` / `no_network=True` XML-parser flags. Copy the
`docinfo.internalDTD` / `docinfo.externalDTD` check in `xml.py` verbatim; do
not re-derive it.

## Fact kinds

Each parser owns its own vocabulary. `kind` is an open string discriminator
and `attrs` (`dict[str, str | int | bool | None]`) carries the kind-specific
payload — a new parser adds kinds without changing `Fact`, `Provenance`, or
any core code. **Register your kinds in this table when you add them.**
Nobody downstream can consume a fact kind they don't know exists.

### `xml` (`app/parsing/parsers/xml.py`)

| kind | subject | attrs | provenance fields set |
|---|---|---|---|
| `element` | element local name (namespace prefix stripped) | `path` (clean XPath, e.g. `/order/price`), `text` (stripped text or `null`) | `xpath`, `line_start` |
| `attribute` | attribute local name | `path` (e.g. `/order/price/@currency`), `value` (raw string) | `xpath`, `line_start` |

### `field_decl` (cross-parser, reserved — not yet emitted by anything)

A fact of kind `field_decl` declares a field and is what populates
`fields.json`. **No parser emits this kind yet** — field discovery across
XSD/Java/XSLT is Phase 3 work. Until a parser emits `field_decl`,
`fields.json` is **legitimately empty**, and that is correct, not a bug.

Do **not** fabricate `field_decl` facts (or repurpose `element`/`attribute`
facts as if they were field declarations) just to make `fields.json` look
populated while building #3–#5. An empty `fields.json` is an honest, visible
gap; a fabricated one is silently wrong data — the exact failure mode the DTD
section above describes, in a different shape.

| kind | subject | attrs | provenance |
|---|---|---|---|
| `field_decl` | field name | `group`, `description` | wherever the field was declared |

## How to add a parser

1. Create `app/parsing/parsers/<name>.py`.
2. Decorate the class with `@register` from `app.parsing.registry`. The
   `type` class var is the string the config's `type:` binding matches
   against; `register` raises `RegistryError` if `type` is missing or already
   taken, so a duplicate or typo'd type fails loudly at import time.
3. **Import the module in `scripts/run_parse.py`.** Registration happens as
   an import side effect (the `@register` decorator runs when the module is
   imported) — a module nobody imports never registers, and a config that
   references its `type:` dies at runtime with an unknown-type
   `RegistryError`, not a helpful "you forgot to import this" message. This
   step is easy to skip because the parser itself works fine in isolation
   and in its own unit tests; only the end-to-end `run_parse.py` invocation
   exposes the missing import. `run_parse.py` currently has:

   ```python
   # Importing a parser module runs its @register decorator. Without this the
   # registry is empty and every run fails with an unknown-type error.
   import app.parsing.parsers.xml  # noqa: F401,E402
   ```

   Add your module to that same import block.
4. Fill in the `Fact.kind` table above with every kind your parser emits,
   in the same PR.
5. Write golden-file tests against `InMemoryFactSink` (see Testing below).

Skeleton to copy:

```python
from typing import Iterator

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.registry import register


@register
class XsdParser:
    type = "xsd"
    version = "0.1.0"

    def parse(
        self, source: str, base: Provenance
    ) -> Iterator[Fact | ParseIssue]:
        try:
            ...  # parse `source`
        except SomeParseLibraryError as exc:
            yield ParseIssue(
                severity=Severity.ERROR,
                parser=self.type,
                file=base.file,
                message=f"malformed XSD: {exc}",
                provenance=base,
            )
            return

        yield Fact(
            kind="...",
            subject="...",
            attrs={...},
            provenance=base.model_copy(update={"xpath": "...", "line_start": 1}),
        )
```

## Provenance is mandatory

Every `Fact` and every `ParseIssue` carries a `Provenance` (Rule 3 — see
`app/parsing/facts.py`). Never construct one from scratch inside a parser:
`base` arrives pre-filled with everything the parser itself has no way to
know (`module`, `file`, `source_hash`, `parser`, `parser_version`,
`parsed_at`). Copy it with `model_copy(update={...})` and fill in only the
location fields you *do* know at that point in the parse:

- `line_start` / `line_end` — best line-number fix you have; `None` if the
  underlying library doesn't expose one.
- `symbol` — fully-qualified class/method (Java), XSLT template name, XSD
  element/type name — whatever "which named thing is this" means for your
  language.
- `xpath` — for XML-family formats, the path to the node.

Never mutate `base` in place and never build a fresh `Provenance(...)` with
your own guesses for the fields `base` already set — that silently discards
real provenance for a stale or wrong copy.

## Testing

Golden-file style: a small fixture string in, an exact expected list of
`Fact`/`ParseIssue` out, asserted against `InMemoryFactSink`
(`app/parsing/sinks.py`) — a sink that just keeps everything in memory as
`.facts` and `.issues` lists, for tests. Copy the shape of
`tests/parsing/test_xml_parser.py`:

```python
from datetime import datetime

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.parsers.xsd import XsdParser


def _prov() -> Provenance:
    return Provenance(
        module="order-intake",
        file="order.xsd",
        source_hash="h",
        parser="xsd",
        parser_version="0.1.0",
        parsed_at=datetime(2026, 7, 14),
    )


def _parse(source: str) -> list[Fact | ParseIssue]:
    return list(XsdParser().parse(source, _prov()))
```

Cover at minimum: one happy-path fixture per fact kind you emit, one
malformed-input case (asserts a `ParseIssue` with `severity == Severity.ERROR`
and zero facts), and — if your format is XML-family — one case with a
`<!DOCTYPE>` declaration, asserting it is refused exactly like the base `xml`
parser refuses it.

**No test in `tests/parsing/` may touch MSSQL or Neo4j.** The whole parsing
subsystem runs offline, against strings and `InMemoryFactSink`/temp files
only — that is what makes it independently testable and CI-friendly. Run
just this subsystem's tests with:

```bash
cd lineage-backend
python3 -m pytest tests/parsing/ -v
```

The Rule-1 guard (`tests/parsing/test_rules.py`) additionally fails the build
if any file under `app/parsing/` imports an LLM client — see that file for
what "LLM client" means structurally. You do not need to do anything to
satisfy it beyond not importing one; if it fails, remove the import.
