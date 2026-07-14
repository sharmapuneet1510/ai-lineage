# Parser Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the config-driven parsing foundation in `lineage-backend/app/parsing/` — the `Parser` contract, provenance-carrying `Fact` model, `FactSink` abstraction, run lifecycle, indexes, and an XML reference parser — so the Java/XSLT/XSD/document parsers can be built on a settled contract.

**Architecture:** Parsers emit source-faithful atomic facts (never lineage inferences) into a `FactSink`. A declarative YAML config binds parser types to file globs per module. A runner walks files, dispatches to parsers, and writes four artifacts. No database and no LLM client is touched anywhere in the package.

**Tech Stack:** Python 3.11, pydantic 2.5 (already present), pyyaml (new), lxml (new), pytest 7.4 (already present).

**Spec:** `docs/superpowers/specs/2026-07-14-parser-foundation-design.md`

## Global Constraints

- **No LLM client may be imported anywhere under `app/parsing/`.** Rule 1 — deterministic parsing establishes facts. This is enforced by a test (Task 11).
- **`Provenance` is required on every `Fact`.** Rule 3 — never optional, never omitted.
- **No domain concept may be hardcoded.** Rule 5 — all source locations, module names, and parser bindings come from config.
- **No test may touch MSSQL or Neo4j.** The whole subsystem runs offline.
- All commands run from `lineage-backend/`.
- Python 3.11. Type hints use PEP 604 (`str | None`), not `Optional[str]`.
- Tests are plain pytest functions (no classes), matching `tests/test_health.py`.

---

## File Structure

| File | Responsibility |
|---|---|
| `app/parsing/facts.py` | `Severity`, `Provenance`, `Fact`, `ParseIssue`. No dependencies on anything else in the package. |
| `app/parsing/config.py` | `ParseConfig` + nested models, YAML loader, validation. |
| `app/parsing/parsers/base.py` | The `Parser` protocol. |
| `app/parsing/registry.py` | Parser type string → `Parser` class. |
| `app/parsing/walker.py` | Module + globs → `SourceFile` stream (decoded text + sha256). |
| `app/parsing/sinks.py` | `FactSink` protocol, `InMemoryFactSink`, `JsonlFactSink`. |
| `app/parsing/parsers/xml.py` | XML reference parser — proves the contract end to end. |
| `app/parsing/runner.py` | config → walk → dispatch → sink → `RunSummary`. |
| `app/parsing/index.py` | Facts → `fields.json` + `evidence.idx`. |
| `app/parsing/embedder.py` | `Embedder` port + `LocalEmbedder` / `HostedEmbedder`. |
| `scripts/run_parse.py` | CLI entrypoint. |
| `docs/PARSERS.md` | Developer guide: how to add a parser. |

---

### Task 1: Fact model

**Files:**
- Create: `lineage-backend/app/parsing/__init__.py` (empty)
- Create: `lineage-backend/app/parsing/facts.py`
- Test: `lineage-backend/tests/parsing/__init__.py` (empty), `lineage-backend/tests/parsing/test_facts.py`

**Interfaces:**
- Consumes: nothing.
- Produces: `Severity` (str enum: `WARNING`/`ERROR`/`FATAL`), `Provenance`, `Fact`, `ParseIssue`. Every later task imports these.

- [ ] **Step 1: Write the failing tests**

Create `lineage-backend/tests/parsing/__init__.py` (empty file) and `lineage-backend/tests/parsing/test_facts.py`:

```python
from datetime import datetime

import pytest
from pydantic import ValidationError

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity


def _provenance() -> Provenance:
    return Provenance(
        module="pricing-core",
        file="src/pricing/Pricer.java",
        source_hash="ab12",
        parser="java",
        parser_version="0.1.0",
        parsed_at=datetime(2026, 7, 14, 9, 0, 0),
    )


def test_provenance_requires_module_file_hash_and_parser():
    with pytest.raises(ValidationError):
        Provenance(module="pricing-core")


def test_provenance_optional_location_fields_default_to_none():
    prov = _provenance()
    assert prov.line_start is None
    assert prov.line_end is None
    assert prov.symbol is None
    assert prov.xpath is None


def test_fact_requires_provenance():
    with pytest.raises(ValidationError):
        Fact(kind="assignment", subject="price")


def test_fact_defaults_reads_writes_and_attrs_to_empty():
    fact = Fact(kind="assignment", subject="price", provenance=_provenance())
    assert fact.reads == []
    assert fact.writes == []
    assert fact.attrs == {}


def test_fact_carries_kind_specific_payload_in_attrs():
    fact = Fact(
        kind="assignment",
        subject="price",
        reads=["base", "discount"],
        writes=["price"],
        attrs={"expr": "base*(1-discount)"},
        provenance=_provenance(),
    )
    assert fact.attrs["expr"] == "base*(1-discount)"
    assert fact.reads == ["base", "discount"]


def test_parse_issue_severity_values():
    assert Severity.WARNING == "warning"
    assert Severity.ERROR == "error"
    assert Severity.FATAL == "fatal"


def test_parse_issue_provenance_is_optional():
    issue = ParseIssue(
        severity=Severity.ERROR,
        parser="java",
        file="src/pricing/Rounding.java",
        message="UnicodeDecodeError at byte 0x9f",
    )
    assert issue.provenance is None
    assert issue.severity == Severity.ERROR
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_facts.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.parsing'`

- [ ] **Step 3: Write the implementation**

Create `lineage-backend/app/parsing/__init__.py` as an empty file.

Create `lineage-backend/app/parsing/facts.py`:

```python
"""The vocabulary every parser emits.

A Fact is something a parser literally saw in the source. It is never an
inference: parsers do not decide what a field is or where lineage flows.
Deriving lineage from facts is the tracing stage's job.
"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel


class Severity(str, Enum):
    WARNING = "warning"  # parsed, but a construct was skipped
    ERROR = "error"      # file did not parse; the run continues
    FATAL = "fatal"      # the run cannot proceed


class Provenance(BaseModel):
    """Where a fact came from. Required on every fact (Rule 3)."""

    module: str
    file: str  # repo-relative
    source_hash: str  # sha256 of the file's bytes
    parser: str
    parser_version: str
    parsed_at: datetime
    line_start: int | None = None
    line_end: int | None = None
    symbol: str | None = None  # FQ class/method, XSLT template, XSD element
    xpath: str | None = None


class Fact(BaseModel):
    """One atomic observation.

    `kind` is an open discriminator owned by the emitting parser, and `attrs`
    carries the kind-specific payload. This lets each parser add its own
    vocabulary without changing core code.
    """

    kind: str
    subject: str
    reads: list[str] = []
    writes: list[str] = []
    attrs: dict[str, str | int | bool | None] = {}
    provenance: Provenance


class ParseIssue(BaseModel):
    """A file that would not parse, or a construct that was skipped.

    Emitted to the sink alongside facts so a gap is visible and attributable
    rather than a field that silently appears to have no lineage.
    """

    severity: Severity
    parser: str
    file: str
    message: str
    provenance: Provenance | None = None
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_facts.py -v`
Expected: PASS — 7 passed

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/parsing/__init__.py lineage-backend/app/parsing/facts.py lineage-backend/tests/parsing/
git commit -m "feat(parsing): Fact, Provenance, ParseIssue model"
```

---

### Task 2: Config schema and loader

**Files:**
- Create: `lineage-backend/app/parsing/config.py`
- Modify: `lineage-backend/requirements.txt` (add `pyyaml==6.0.1`)
- Test: `lineage-backend/tests/parsing/test_config.py`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `ParserBinding(type: str, include: list[str], exclude: list[str], options: dict)`
  - `ModuleConfig(name: str, root: str, parsers: list[ParserBinding])`
  - `XsdStore(name: str, root: str, include: list[str])`
  - `Options(encoding: str, fail_on: FailOn, output_dir: str)`, `FailOn` str enum (`NEVER`/`ERROR`)
  - `ParseConfig(version: int, modules: list[ModuleConfig], xsd_stores: list[XsdStore], options: Options)`
  - `load_config(path: Path) -> ParseConfig` — raises `ConfigError` on any validation failure.
  - `ConfigError(Exception)`
  - `ParseConfig.config_dir: Path` — the directory the config was loaded from; all `root` values resolve against it.

**Note on `type` validation:** `load_config` does *not* check that `type` is a registered parser — the registry does not exist yet and importing it here would create a cycle. Task 4 adds that check in the runner.

- [ ] **Step 1: Write the failing tests**

Create `lineage-backend/tests/parsing/test_config.py`:

```python
from pathlib import Path

import pytest

from app.parsing.config import ConfigError, FailOn, load_config

VALID = """
version: 1
modules:
  - name: pricing-core
    root: ./src/pricing
    parsers:
      - type: java
        include: ["**/*.java"]
        exclude: ["**/test/**"]
      - type: xslt
        include: ["**/*.xsl"]
xsd_stores:
  - name: outbound
    root: ./schemas/out
options:
  fail_on: never
"""


def _write(tmp_path: Path, text: str) -> Path:
    (tmp_path / "src" / "pricing").mkdir(parents=True, exist_ok=True)
    (tmp_path / "schemas" / "out").mkdir(parents=True, exist_ok=True)
    path = tmp_path / "parse.config.yaml"
    path.write_text(text)
    return path


def test_loads_a_valid_config(tmp_path):
    config = load_config(_write(tmp_path, VALID))
    assert config.version == 1
    assert len(config.modules) == 1
    assert config.modules[0].name == "pricing-core"
    assert len(config.modules[0].parsers) == 2
    assert config.modules[0].parsers[0].type == "java"
    assert config.modules[0].parsers[0].exclude == ["**/test/**"]
    assert config.xsd_stores[0].name == "outbound"


def test_defaults_are_applied(tmp_path):
    config = load_config(_write(tmp_path, VALID))
    assert config.options.encoding == "utf-8"
    assert config.options.fail_on == FailOn.NEVER
    assert config.options.output_dir == "./out"
    # exclude defaults to empty; xsd_store include defaults to **/*.xsd
    assert config.modules[0].parsers[1].exclude == []
    assert config.xsd_stores[0].include == ["**/*.xsd"]


def test_config_dir_is_the_configs_own_directory(tmp_path):
    config = load_config(_write(tmp_path, VALID))
    assert config.config_dir == tmp_path


def test_unsupported_version_is_rejected(tmp_path):
    bad = VALID.replace("version: 1", "version: 99")
    with pytest.raises(ConfigError, match="version"):
        load_config(_write(tmp_path, bad))


def test_missing_modules_is_rejected(tmp_path):
    with pytest.raises(ConfigError):
        load_config(_write(tmp_path, "version: 1\nmodules: []\n"))


def test_duplicate_module_names_are_rejected(tmp_path):
    dupe = """
version: 1
modules:
  - name: dupe
    root: ./src/pricing
    parsers:
      - type: xml
        include: ["**/*.xml"]
  - name: dupe
    root: ./src/pricing
    parsers:
      - type: xml
        include: ["**/*.xml"]
"""
    with pytest.raises(ConfigError, match="duplicate"):
        load_config(_write(tmp_path, dupe))


def test_missing_root_directory_is_rejected(tmp_path):
    bad = VALID.replace("./src/pricing", "./does/not/exist")
    with pytest.raises(ConfigError, match="does not exist"):
        load_config(_write(tmp_path, bad))


def test_malformed_yaml_is_rejected(tmp_path):
    with pytest.raises(ConfigError):
        load_config(_write(tmp_path, "version: 1\n  modules: [oops\n"))
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_config.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.parsing.config'`

- [ ] **Step 3: Add the dependency**

Add this line to `lineage-backend/requirements.txt`:

```
pyyaml==6.0.1
```

Then install it:

```bash
cd lineage-backend && pip install pyyaml==6.0.1
```

- [ ] **Step 4: Write the implementation**

Create `lineage-backend/app/parsing/config.py`:

```python
"""Declarative parse configuration.

Declares WHAT to parse and WITH WHICH parser. Extraction logic stays in code —
this is deliberately not a DSL. No domain concept is compiled into the package
(Rule 5).
"""
from enum import Enum
from pathlib import Path

import yaml
from pydantic import BaseModel, Field, ValidationError

SUPPORTED_VERSIONS = {1}


class ConfigError(Exception):
    """Raised for any invalid config. Always fatal — the run cannot proceed."""


class FailOn(str, Enum):
    NEVER = "never"  # record issues and continue (recommended)
    ERROR = "error"  # abort on the first error-severity issue


class ParserBinding(BaseModel):
    type: str
    include: list[str]
    exclude: list[str] = []
    options: dict = {}


class ModuleConfig(BaseModel):
    name: str
    root: str
    parsers: list[ParserBinding] = Field(min_length=1)


class XsdStore(BaseModel):
    name: str
    root: str
    include: list[str] = ["**/*.xsd"]


class Options(BaseModel):
    encoding: str = "utf-8"
    fail_on: FailOn = FailOn.NEVER
    output_dir: str = "./out"


class ParseConfig(BaseModel):
    version: int
    modules: list[ModuleConfig] = Field(min_length=1)
    xsd_stores: list[XsdStore] = []
    options: Options = Options()

    # Set by load_config. All `root` values resolve against this.
    config_dir: Path = Path(".")

    def resolve(self, root: str) -> Path:
        return (self.config_dir / root).resolve()


def load_config(path: Path) -> ParseConfig:
    """Load and validate a config file. Raises ConfigError on any problem."""
    path = Path(path)
    try:
        raw = yaml.safe_load(path.read_text())
    except yaml.YAMLError as exc:
        raise ConfigError(f"{path}: malformed YAML: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"{path}: cannot read config: {exc}") from exc

    if not isinstance(raw, dict):
        raise ConfigError(f"{path}: config must be a YAML mapping")

    try:
        config = ParseConfig(**raw, config_dir=path.parent)
    except ValidationError as exc:
        raise ConfigError(f"{path}: {exc}") from exc

    if config.version not in SUPPORTED_VERSIONS:
        raise ConfigError(
            f"{path}: unsupported config version {config.version}; "
            f"supported: {sorted(SUPPORTED_VERSIONS)}"
        )

    _reject_duplicate_names(path, config)
    _reject_missing_roots(path, config)
    return config


def _reject_duplicate_names(path: Path, config: ParseConfig) -> None:
    for label, names in (
        ("module", [m.name for m in config.modules]),
        ("xsd_store", [s.name for s in config.xsd_stores]),
    ):
        seen: set[str] = set()
        for name in names:
            if name in seen:
                raise ConfigError(f"{path}: duplicate {label} name {name!r}")
            seen.add(name)


def _reject_missing_roots(path: Path, config: ParseConfig) -> None:
    roots = [(m.name, m.root) for m in config.modules]
    roots += [(s.name, s.root) for s in config.xsd_stores]
    for name, root in roots:
        resolved = config.resolve(root)
        if not resolved.is_dir():
            raise ConfigError(
                f"{path}: root for {name!r} does not exist: {resolved}"
            )
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_config.py -v`
Expected: PASS — 8 passed

- [ ] **Step 6: Commit**

```bash
git add lineage-backend/app/parsing/config.py lineage-backend/tests/parsing/test_config.py lineage-backend/requirements.txt
git commit -m "feat(parsing): ParseConfig schema, YAML loader, validation"
```

---

### Task 3: Parser protocol and registry

**Files:**
- Create: `lineage-backend/app/parsing/parsers/__init__.py` (empty)
- Create: `lineage-backend/app/parsing/parsers/base.py`
- Create: `lineage-backend/app/parsing/registry.py`
- Test: `lineage-backend/tests/parsing/test_registry.py`

**Interfaces:**
- Consumes: `Fact`, `ParseIssue`, `Provenance` from Task 1.
- Produces:
  - `Parser` protocol — class vars `type: str`, `version: str`; method `parse(self, source: str, base: Provenance) -> Iterator[Fact | ParseIssue]`.
  - `register(cls)` — class decorator; raises `RegistryError` on a duplicate type.
  - `get_parser(type: str) -> Parser` — returns an *instance*; raises `RegistryError` if unregistered.
  - `registered_types() -> list[str]` — sorted.
  - `RegistryError(Exception)`

- [ ] **Step 1: Write the failing tests**

Create `lineage-backend/tests/parsing/test_registry.py`:

```python
from datetime import datetime
from typing import Iterator

import pytest

from app.parsing import registry
from app.parsing.facts import Fact, ParseIssue, Provenance
from app.parsing.registry import RegistryError, get_parser, register, registered_types


@pytest.fixture(autouse=True)
def clean_registry():
    """Each test gets a pristine registry."""
    saved = dict(registry._PARSERS)
    registry._PARSERS.clear()
    yield
    registry._PARSERS.clear()
    registry._PARSERS.update(saved)


def _make_parser(parser_type: str):
    @register
    class _Fake:
        type = parser_type
        version = "0.1.0"

        def parse(self, source: str, base: Provenance) -> Iterator[Fact | ParseIssue]:
            yield Fact(kind="fake", subject=source, provenance=base)

    return _Fake


def test_register_then_get_returns_an_instance():
    _make_parser("fake")
    parser = get_parser("fake")
    assert parser.type == "fake"
    assert parser.version == "0.1.0"


def test_registered_types_is_sorted():
    _make_parser("zzz")
    _make_parser("aaa")
    assert registered_types() == ["aaa", "zzz"]


def test_duplicate_registration_is_rejected():
    _make_parser("fake")
    with pytest.raises(RegistryError, match="already registered"):
        _make_parser("fake")


def test_unknown_type_is_rejected_and_lists_known_types():
    _make_parser("xml")
    with pytest.raises(RegistryError, match="xml"):
        get_parser("java")


def test_a_registered_parser_yields_facts():
    _make_parser("fake")
    prov = Provenance(
        module="m",
        file="f",
        source_hash="h",
        parser="fake",
        parser_version="0.1.0",
        parsed_at=datetime(2026, 7, 14),
    )
    facts = list(get_parser("fake").parse("hello", prov))
    assert len(facts) == 1
    assert facts[0].subject == "hello"
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_registry.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.parsing.registry'`

- [ ] **Step 3: Write the implementation**

Create `lineage-backend/app/parsing/parsers/__init__.py` as an empty file.

Create `lineage-backend/app/parsing/parsers/base.py`:

```python
"""The parser contract.

A parser knows nothing about config, sinks, databases, or other parsers. It
receives decoded source text plus a partially-filled Provenance and yields
facts and issues. That narrow surface is what makes each parser independently
testable and lets new parsers be added without touching core code.
"""
from typing import ClassVar, Iterator, Protocol, runtime_checkable

from app.parsing.facts import Fact, ParseIssue, Provenance


@runtime_checkable
class Parser(Protocol):
    type: ClassVar[str]     # matches the config `type:` binding
    version: ClassVar[str]  # recorded in every fact's provenance

    def parse(
        self, source: str, base: Provenance
    ) -> Iterator[Fact | ParseIssue]:
        """Yield every fact observed in `source`.

        `base` already carries module, file, source_hash, parser,
        parser_version and parsed_at. Parsers copy it and fill in the
        location fields they know (line_start, line_end, symbol, xpath).

        A parser must not raise on malformed input — it yields a ParseIssue
        with severity ERROR instead, so the run can continue.
        """
        ...
```

Create `lineage-backend/app/parsing/registry.py`:

```python
"""Parser type string -> Parser class."""
from app.parsing.parsers.base import Parser

_PARSERS: dict[str, type] = {}


class RegistryError(Exception):
    pass


def register(cls: type) -> type:
    """Class decorator. Registers a parser under its `type` class var."""
    parser_type = getattr(cls, "type", None)
    if not parser_type:
        raise RegistryError(f"{cls.__name__} has no `type` class var")
    if parser_type in _PARSERS:
        raise RegistryError(f"parser type {parser_type!r} is already registered")
    _PARSERS[parser_type] = cls
    return cls


def get_parser(parser_type: str) -> Parser:
    """Return a parser instance. Raises RegistryError if unregistered."""
    cls = _PARSERS.get(parser_type)
    if cls is None:
        raise RegistryError(
            f"unknown parser type {parser_type!r}; "
            f"registered: {registered_types()}"
        )
    return cls()


def registered_types() -> list[str]:
    return sorted(_PARSERS)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_registry.py -v`
Expected: PASS — 5 passed

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/parsing/parsers/ lineage-backend/app/parsing/registry.py lineage-backend/tests/parsing/test_registry.py
git commit -m "feat(parsing): Parser protocol and type registry"
```

---

### Task 4: Source walker

**Files:**
- Create: `lineage-backend/app/parsing/walker.py`
- Test: `lineage-backend/tests/parsing/test_walker.py`

**Interfaces:**
- Consumes: `ModuleConfig`, `ParseConfig`, `Options` (Task 2); `ParseIssue`, `Severity` (Task 1).
- Produces:
  - `SourceFile(module: str, parser_type: str, rel_path: str, abs_path: Path, text: str, source_hash: str)` — a pydantic model.
  - `walk_module(module: ModuleConfig, config: ParseConfig) -> Iterator[SourceFile | ParseIssue]` — yields one `SourceFile` per matched, decodable file; a `ParseIssue(severity=ERROR)` per file that fails to decode.
  - `sha256_bytes(data: bytes) -> str`

**Behavior notes:**
- `rel_path` is relative to the **module root**, using forward slashes on every platform.
- `exclude` is applied after `include`.
- If two bindings in one module match the same file, it is parsed by each — that is legitimate (e.g. an `.xml` file that is also an XSLT). Dedup is not the walker's job.

- [ ] **Step 1: Write the failing tests**

Create `lineage-backend/tests/parsing/test_walker.py`:

```python
import hashlib

from app.parsing.config import FailOn, ModuleConfig, Options, ParseConfig, ParserBinding
from app.parsing.facts import ParseIssue, Severity
from app.parsing.walker import SourceFile, sha256_bytes, walk_module


def _config(tmp_path, binding: ParserBinding) -> tuple[ParseConfig, ModuleConfig]:
    module = ModuleConfig(name="m", root="./src", parsers=[binding])
    config = ParseConfig(
        version=1, modules=[module], options=Options(), config_dir=tmp_path
    )
    return config, module


def test_sha256_matches_hashlib():
    assert sha256_bytes(b"abc") == hashlib.sha256(b"abc").hexdigest()


def test_include_glob_matches_files(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "a.xml").write_text("<a/>")
    (tmp_path / "src" / "b.txt").write_text("nope")

    config, module = _config(tmp_path, ParserBinding(type="xml", include=["**/*.xml"]))
    results = list(walk_module(module, config))

    assert len(results) == 1
    assert isinstance(results[0], SourceFile)
    assert results[0].rel_path == "a.xml"
    assert results[0].text == "<a/>"
    assert results[0].parser_type == "xml"
    assert results[0].module == "m"


def test_exclude_is_applied_after_include(tmp_path):
    (tmp_path / "src" / "test").mkdir(parents=True)
    (tmp_path / "src" / "keep.xml").write_text("<a/>")
    (tmp_path / "src" / "test" / "skip.xml").write_text("<a/>")

    config, module = _config(
        tmp_path,
        ParserBinding(type="xml", include=["**/*.xml"], exclude=["**/test/**"]),
    )
    paths = [r.rel_path for r in walk_module(module, config)]

    assert paths == ["keep.xml"]


def test_rel_path_uses_forward_slashes(tmp_path):
    (tmp_path / "src" / "deep" / "nested").mkdir(parents=True)
    (tmp_path / "src" / "deep" / "nested" / "a.xml").write_text("<a/>")

    config, module = _config(tmp_path, ParserBinding(type="xml", include=["**/*.xml"]))
    results = list(walk_module(module, config))

    assert results[0].rel_path == "deep/nested/a.xml"


def test_source_hash_is_of_the_raw_bytes(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "a.xml").write_text("<a/>")

    config, module = _config(tmp_path, ParserBinding(type="xml", include=["**/*.xml"]))
    results = list(walk_module(module, config))

    assert results[0].source_hash == hashlib.sha256(b"<a/>").hexdigest()


def test_undecodable_file_yields_an_error_issue_not_a_crash(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "bad.xml").write_bytes(b"\xff\xfe\x9f invalid utf-8")

    config, module = _config(tmp_path, ParserBinding(type="xml", include=["**/*.xml"]))
    results = list(walk_module(module, config))

    assert len(results) == 1
    issue = results[0]
    assert isinstance(issue, ParseIssue)
    assert issue.severity == Severity.ERROR
    assert issue.file == "bad.xml"
    assert "decode" in issue.message.lower()


def test_one_file_matched_by_two_bindings_is_yielded_twice(tmp_path):
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "a.xml").write_text("<a/>")

    module = ModuleConfig(
        name="m",
        root="./src",
        parsers=[
            ParserBinding(type="xml", include=["**/*.xml"]),
            ParserBinding(type="xslt", include=["**/*.xml"]),
        ],
    )
    config = ParseConfig(
        version=1, modules=[module], options=Options(), config_dir=tmp_path
    )
    types = sorted(r.parser_type for r in walk_module(module, config))

    assert types == ["xml", "xslt"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_walker.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.parsing.walker'`

- [ ] **Step 3: Write the implementation**

Create `lineage-backend/app/parsing/walker.py`:

```python
"""Module + globs -> decoded, hashed source files."""
import hashlib
from pathlib import Path
from typing import Iterator

from pydantic import BaseModel

from app.parsing.config import ModuleConfig, ParseConfig, ParserBinding
from app.parsing.facts import ParseIssue, Severity


class SourceFile(BaseModel):
    module: str
    parser_type: str
    rel_path: str  # relative to the module root, forward slashes
    abs_path: Path
    text: str
    source_hash: str  # sha256 of the raw bytes


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def walk_module(
    module: ModuleConfig, config: ParseConfig
) -> Iterator[SourceFile | ParseIssue]:
    """Yield a SourceFile per matched file, or an ERROR issue if it won't decode.

    A file matched by two bindings is yielded once per binding — legitimate for
    e.g. an .xml file that is also an XSLT. Dedup is not the walker's concern.
    """
    root = config.resolve(module.root)
    for binding in module.parsers:
        for abs_path in _matching_files(root, binding):
            rel_path = abs_path.relative_to(root).as_posix()
            data = abs_path.read_bytes()
            try:
                text = data.decode(config.options.encoding)
            except UnicodeDecodeError as exc:
                yield ParseIssue(
                    severity=Severity.ERROR,
                    parser=binding.type,
                    file=rel_path,
                    message=(
                        f"cannot decode as {config.options.encoding}: {exc}"
                    ),
                )
                continue
            yield SourceFile(
                module=module.name,
                parser_type=binding.type,
                rel_path=rel_path,
                abs_path=abs_path,
                text=text,
                source_hash=sha256_bytes(data),
            )


def _matching_files(root: Path, binding: ParserBinding) -> list[Path]:
    included: set[Path] = set()
    for pattern in binding.include:
        included.update(p for p in root.glob(pattern) if p.is_file())

    excluded: set[Path] = set()
    for pattern in binding.exclude:
        excluded.update(root.glob(pattern))

    kept = [
        p
        for p in included
        if not any(p == e or e in p.parents for e in excluded)
    ]
    return sorted(kept)
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_walker.py -v`
Expected: PASS — 7 passed

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/parsing/walker.py lineage-backend/tests/parsing/test_walker.py
git commit -m "feat(parsing): source walker with globs, hashing, decode errors"
```

---

### Task 5: Fact sinks

**Files:**
- Create: `lineage-backend/app/parsing/sinks.py`
- Test: `lineage-backend/tests/parsing/test_sinks.py`

**Interfaces:**
- Consumes: `Fact`, `ParseIssue` (Task 1).
- Produces:
  - `FactSink` protocol — `emit(item: Fact | ParseIssue) -> None`, `close() -> None`.
  - `InMemoryFactSink` — `.items: list`, plus convenience `.facts` and `.issues` properties.
  - `JsonlFactSink(path: Path)` — one JSON object per line; each line carries a `"record"` key of `"fact"` or `"issue"` so a reader can discriminate. Supports the context-manager protocol.

**Why this seam exists:** sub-project #2's graph writer becomes just another `FactSink`, with no parser changes.

- [ ] **Step 1: Write the failing tests**

Create `lineage-backend/tests/parsing/test_sinks.py`:

```python
import json
from datetime import datetime

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.sinks import InMemoryFactSink, JsonlFactSink


def _prov() -> Provenance:
    return Provenance(
        module="m",
        file="a.xml",
        source_hash="h",
        parser="xml",
        parser_version="0.1.0",
        parsed_at=datetime(2026, 7, 14),
    )


def _fact() -> Fact:
    return Fact(kind="element", subject="order", provenance=_prov())


def _issue() -> ParseIssue:
    return ParseIssue(
        severity=Severity.ERROR, parser="xml", file="bad.xml", message="boom"
    )


def test_in_memory_sink_separates_facts_from_issues():
    sink = InMemoryFactSink()
    sink.emit(_fact())
    sink.emit(_issue())
    sink.close()

    assert len(sink.items) == 2
    assert len(sink.facts) == 1
    assert len(sink.issues) == 1
    assert sink.facts[0].subject == "order"
    assert sink.issues[0].message == "boom"


def test_jsonl_sink_writes_one_object_per_line(tmp_path):
    path = tmp_path / "facts.jsonl"
    with JsonlFactSink(path) as sink:
        sink.emit(_fact())
        sink.emit(_issue())

    lines = path.read_text().strip().split("\n")
    assert len(lines) == 2

    first = json.loads(lines[0])
    assert first["record"] == "fact"
    assert first["kind"] == "element"
    assert first["provenance"]["source_hash"] == "h"

    second = json.loads(lines[1])
    assert second["record"] == "issue"
    assert second["severity"] == "error"


def test_jsonl_sink_creates_parent_directories(tmp_path):
    path = tmp_path / "nested" / "deep" / "facts.jsonl"
    with JsonlFactSink(path) as sink:
        sink.emit(_fact())

    assert path.exists()
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_sinks.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.parsing.sinks'`

- [ ] **Step 3: Write the implementation**

Create `lineage-backend/app/parsing/sinks.py`:

```python
"""Where facts go. Parsers never touch a database.

Sub-project #2's graph writer is just another FactSink implementation — that is
the point of this seam.
"""
import json
from pathlib import Path
from typing import Protocol

from app.parsing.facts import Fact, ParseIssue


class FactSink(Protocol):
    def emit(self, item: Fact | ParseIssue) -> None: ...
    def close(self) -> None: ...


class InMemoryFactSink:
    """For tests. Keeps everything in a list."""

    def __init__(self) -> None:
        self.items: list[Fact | ParseIssue] = []

    def emit(self, item: Fact | ParseIssue) -> None:
        self.items.append(item)

    def close(self) -> None:
        pass

    @property
    def facts(self) -> list[Fact]:
        return [i for i in self.items if isinstance(i, Fact)]

    @property
    def issues(self) -> list[ParseIssue]:
        return [i for i in self.items if isinstance(i, ParseIssue)]


class JsonlFactSink:
    """One JSON object per line. Replayable and diffable between runs."""

    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._handle = self.path.open("w", encoding="utf-8")

    def emit(self, item: Fact | ParseIssue) -> None:
        record = "fact" if isinstance(item, Fact) else "issue"
        payload = {"record": record, **item.model_dump(mode="json")}
        self._handle.write(json.dumps(payload) + "\n")

    def close(self) -> None:
        self._handle.close()

    def __enter__(self) -> "JsonlFactSink":
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_sinks.py -v`
Expected: PASS — 3 passed

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/parsing/sinks.py lineage-backend/tests/parsing/test_sinks.py
git commit -m "feat(parsing): FactSink protocol, in-memory and JSONL sinks"
```

---

### Task 6: XML reference parser

**Files:**
- Create: `lineage-backend/app/parsing/parsers/xml.py`
- Modify: `lineage-backend/requirements.txt` (add `lxml==5.1.0`)
- Test: `lineage-backend/tests/parsing/test_xml_parser.py`

**Interfaces:**
- Consumes: `Fact`, `ParseIssue`, `Provenance`, `Severity` (Task 1); `register` (Task 3).
- Produces: `XmlParser` with `type = "xml"`, `version = "0.1.0"`, registered under `"xml"`.

**Fact kinds this parser emits** (its own vocabulary — documented in `docs/PARSERS.md` in Task 11):

| kind | subject | attrs | provenance |
|---|---|---|---|
| `element` | the element's tag (localname) | `{"path": <xpath>, "text": <stripped text or None>}` | `xpath`, `line_start` |
| `attribute` | the attribute's name | `{"path": <xpath>, "value": <attr value>}` | `xpath`, `line_start` |

Malformed XML yields a single `ParseIssue(severity=ERROR)` and no facts. The parser never raises.

- [ ] **Step 1: Write the failing tests**

Create `lineage-backend/tests/parsing/test_xml_parser.py`:

```python
from datetime import datetime

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.parsers.xml import XmlParser

SAMPLE = """<?xml version="1.0"?>
<order id="A-1">
  <price currency="USD">42.50</price>
</order>
"""


def _prov() -> Provenance:
    return Provenance(
        module="order-intake",
        file="order.xml",
        source_hash="h",
        parser="xml",
        parser_version="0.1.0",
        parsed_at=datetime(2026, 7, 14),
    )


def _parse(source: str) -> list[Fact | ParseIssue]:
    return list(XmlParser().parse(source, _prov()))


def test_parser_declares_its_type_and_version():
    assert XmlParser.type == "xml"
    assert XmlParser.version == "0.1.0"


def test_emits_an_element_fact_per_element():
    facts = [f for f in _parse(SAMPLE) if isinstance(f, Fact) and f.kind == "element"]
    subjects = sorted(f.subject for f in facts)
    assert subjects == ["order", "price"]


def test_element_fact_carries_xpath_and_line_in_provenance():
    facts = [f for f in _parse(SAMPLE) if isinstance(f, Fact) and f.kind == "element"]
    price = next(f for f in facts if f.subject == "price")
    assert price.provenance.xpath == "/order/price"
    assert price.provenance.line_start == 3
    assert price.attrs["text"] == "42.50"


def test_root_element_has_no_text_payload():
    facts = [f for f in _parse(SAMPLE) if isinstance(f, Fact) and f.kind == "element"]
    order = next(f for f in facts if f.subject == "order")
    assert order.attrs["text"] is None
    assert order.provenance.xpath == "/order"


def test_emits_an_attribute_fact_per_attribute():
    facts = [f for f in _parse(SAMPLE) if isinstance(f, Fact) and f.kind == "attribute"]
    pairs = sorted((f.subject, f.attrs["value"]) for f in facts)
    assert pairs == [("currency", "USD"), ("id", "A-1")]


def test_attribute_xpath_points_at_the_attribute():
    facts = [f for f in _parse(SAMPLE) if isinstance(f, Fact) and f.kind == "attribute"]
    currency = next(f for f in facts if f.subject == "currency")
    assert currency.provenance.xpath == "/order/price/@currency"


def test_every_fact_carries_the_base_provenance():
    for item in _parse(SAMPLE):
        assert isinstance(item, Fact)
        assert item.provenance.module == "order-intake"
        assert item.provenance.file == "order.xml"
        assert item.provenance.source_hash == "h"
        assert item.provenance.parser == "xml"


def test_malformed_xml_yields_an_error_issue_and_no_facts():
    results = _parse("<order><unclosed></order>")
    assert len(results) == 1
    issue = results[0]
    assert isinstance(issue, ParseIssue)
    assert issue.severity == Severity.ERROR
    assert issue.parser == "xml"
    assert issue.file == "order.xml"
    assert issue.provenance is not None


def test_namespaced_elements_use_the_local_name():
    source = '<o:order xmlns:o="urn:x"><o:price>1</o:price></o:order>'
    facts = [f for f in _parse(source) if isinstance(f, Fact) and f.kind == "element"]
    assert sorted(f.subject for f in facts) == ["order", "price"]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_xml_parser.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.parsing.parsers.xml'`

- [ ] **Step 3: Add the dependency**

Add this line to `lineage-backend/requirements.txt`:

```
lxml==5.1.0
```

Then install it:

```bash
cd lineage-backend && pip install lxml==5.1.0
```

- [ ] **Step 4: Write the implementation**

Create `lineage-backend/app/parsing/parsers/xml.py`:

```python
"""XML reference parser.

Deliberately small. Its job is to prove the Parser contract end to end — the
fact model, provenance filling, and the never-raise-always-yield-an-issue error
contract — so that the XSD, XSLT, Java, and document parsers have a pattern to
copy.

Fact kinds emitted:
  element    subject=<localname>  attrs={path, text}   provenance.xpath, line_start
  attribute  subject=<name>       attrs={path, value}  provenance.xpath, line_start
"""
from typing import Iterator

from lxml import etree

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.registry import register


@register
class XmlParser:
    type = "xml"
    version = "0.1.0"

    def parse(
        self, source: str, base: Provenance
    ) -> Iterator[Fact | ParseIssue]:
        try:
            root = etree.fromstring(source.encode("utf-8"))
        except etree.XMLSyntaxError as exc:
            yield ParseIssue(
                severity=Severity.ERROR,
                parser=self.type,
                file=base.file,
                message=f"malformed XML: {exc}",
                provenance=base,
            )
            return

        tree = root.getroottree()
        for element in root.iter():
            if not isinstance(element.tag, str):
                continue  # comments and processing instructions
            path = _clean_path(tree.getpath(element))
            yield Fact(
                kind="element",
                subject=_localname(element.tag),
                attrs={"path": path, "text": _text_of(element)},
                provenance=_at(base, path, element.sourceline),
            )
            for name, value in element.attrib.items():
                attr_path = f"{path}/@{_localname(name)}"
                yield Fact(
                    kind="attribute",
                    subject=_localname(name),
                    attrs={"path": attr_path, "value": value},
                    provenance=_at(base, attr_path, element.sourceline),
                )


def _at(base: Provenance, xpath: str, line: int | None) -> Provenance:
    return base.model_copy(update={"xpath": xpath, "line_start": line})


def _localname(tag: str) -> str:
    """Strip the {namespace} prefix lxml puts on qualified names."""
    return tag.rsplit("}", 1)[-1]


def _clean_path(path: str) -> str:
    """lxml emits /o:order[1]/o:price[1]; we want /order/price."""
    parts = []
    for segment in path.split("/"):
        if not segment:
            continue
        segment = segment.split("[", 1)[0]
        parts.append(segment.rsplit(":", 1)[-1])
    return "/" + "/".join(parts)


def _text_of(element: etree._Element) -> str | None:
    if element.text is None:
        return None
    text = element.text.strip()
    return text or None
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_xml_parser.py -v`
Expected: PASS — 9 passed

- [ ] **Step 6: Commit**

```bash
git add lineage-backend/app/parsing/parsers/xml.py lineage-backend/tests/parsing/test_xml_parser.py lineage-backend/requirements.txt
git commit -m "feat(parsing): XML reference parser"
```

---

### Task 7: Runner and RunSummary

**Files:**
- Create: `lineage-backend/app/parsing/runner.py`
- Test: `lineage-backend/tests/parsing/test_runner.py`

**Interfaces:**
- Consumes: everything from Tasks 1–6.
- Produces:
  - `RunSummary(files_parsed: int, facts: int, facts_by_kind: dict[str,int], issues_by_severity: dict[str,int], duration_s: float)` — pydantic model.
  - `run(config: ParseConfig, sink: FactSink, modules: list[str] | None = None) -> RunSummary`
  - `FatalRunError(Exception)` — raised when a FATAL issue occurs, or when `fail_on=error` and an ERROR issue occurs.

**Behavior:**
- Validates every binding's `type` against the registry **before** walking anything; an unknown type raises `FatalRunError` immediately (this is the registry check deferred from Task 2).
- `modules=["name"]` restricts the run to named modules.
- A parser that raises despite the contract is caught and converted to an `ERROR` issue — a buggy parser must not take down a whole run.
- The sink is **not** closed by `run()`; the caller owns the sink's lifetime.

- [ ] **Step 1: Write the failing tests**

Create `lineage-backend/tests/parsing/test_runner.py`:

```python
import pytest

from app.parsing import registry
from app.parsing.config import (
    FailOn,
    ModuleConfig,
    Options,
    ParseConfig,
    ParserBinding,
)
from app.parsing.facts import Severity
from app.parsing.parsers import xml as xml_parser_module  # registers "xml"
from app.parsing.runner import FatalRunError, RunSummary, run
from app.parsing.sinks import InMemoryFactSink


def _config(tmp_path, parser_type="xml", fail_on=FailOn.NEVER, name="m") -> ParseConfig:
    module = ModuleConfig(
        name=name,
        root="./src",
        parsers=[ParserBinding(type=parser_type, include=["**/*.xml"])],
    )
    return ParseConfig(
        version=1,
        modules=[module],
        options=Options(fail_on=fail_on),
        config_dir=tmp_path,
    )


def _src(tmp_path, name: str, content: str) -> None:
    (tmp_path / "src").mkdir(exist_ok=True)
    (tmp_path / "src" / name).write_text(content)


def test_run_parses_files_and_emits_facts(tmp_path):
    _src(tmp_path, "order.xml", "<order><price>42</price></order>")
    sink = InMemoryFactSink()

    summary = run(_config(tmp_path), sink)

    assert isinstance(summary, RunSummary)
    assert summary.files_parsed == 1
    assert summary.facts == len(sink.facts)
    assert summary.facts_by_kind["element"] == 2
    assert summary.issues_by_severity == {}


def test_unknown_parser_type_is_fatal_before_any_walking(tmp_path):
    _src(tmp_path, "order.xml", "<order/>")
    sink = InMemoryFactSink()

    with pytest.raises(FatalRunError, match="cobol"):
        run(_config(tmp_path, parser_type="cobol"), sink)

    assert sink.items == []


def test_malformed_file_records_an_issue_and_the_run_continues(tmp_path):
    _src(tmp_path, "good.xml", "<order/>")
    _src(tmp_path, "bad.xml", "<order><unclosed></order>")
    sink = InMemoryFactSink()

    summary = run(_config(tmp_path), sink)

    assert summary.issues_by_severity[Severity.ERROR.value] == 1
    assert summary.facts_by_kind["element"] == 1  # good.xml still parsed
    assert any(i.file == "bad.xml" for i in sink.issues)


def test_fail_on_error_aborts_the_run(tmp_path):
    _src(tmp_path, "bad.xml", "<order><unclosed></order>")
    sink = InMemoryFactSink()

    with pytest.raises(FatalRunError, match="bad.xml"):
        run(_config(tmp_path, fail_on=FailOn.ERROR), sink)


def test_module_filter_restricts_the_run(tmp_path):
    _src(tmp_path, "order.xml", "<order/>")
    config = _config(tmp_path, name="wanted")
    sink = InMemoryFactSink()

    summary = run(config, sink, modules=["not-this-one"])

    assert summary.files_parsed == 0
    assert sink.items == []


def test_a_parser_that_raises_becomes_an_issue_not_a_crash(tmp_path, monkeypatch):
    _src(tmp_path, "order.xml", "<order/>")

    class Exploding:
        type = "xml"
        version = "0.0.0"

        def parse(self, source, base):
            raise RuntimeError("parser bug")
            yield  # pragma: no cover

    monkeypatch.setitem(registry._PARSERS, "xml", Exploding)
    sink = InMemoryFactSink()

    summary = run(_config(tmp_path), sink)

    assert summary.issues_by_severity[Severity.ERROR.value] == 1
    assert "parser bug" in sink.issues[0].message
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_runner.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.parsing.runner'`

- [ ] **Step 3: Write the implementation**

Create `lineage-backend/app/parsing/runner.py`:

```python
"""config -> walk -> dispatch -> sink -> summary."""
import time
from collections import Counter
from datetime import datetime, timezone
from typing import Iterator

from pydantic import BaseModel

from app.parsing.config import FailOn, ModuleConfig, ParseConfig
from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.registry import RegistryError, get_parser
from app.parsing.sinks import FactSink
from app.parsing.walker import SourceFile, walk_module


class FatalRunError(Exception):
    """The run cannot proceed."""


class RunSummary(BaseModel):
    files_parsed: int = 0
    facts: int = 0
    facts_by_kind: dict[str, int] = {}
    issues_by_severity: dict[str, int] = {}
    duration_s: float = 0.0


def run(
    config: ParseConfig,
    sink: FactSink,
    modules: list[str] | None = None,
) -> RunSummary:
    """Parse every configured module into `sink`. Does not close the sink."""
    started = time.monotonic()

    selected = [m for m in config.modules if modules is None or m.name in modules]
    _validate_parser_types(selected)

    kinds: Counter[str] = Counter()
    severities: Counter[str] = Counter()
    files = 0

    for module in selected:
        for walked in walk_module(module, config):
            if isinstance(walked, ParseIssue):
                severities[walked.severity.value] += 1
                sink.emit(walked)
                _maybe_abort(config, walked)
                continue

            files += 1
            for item in _parse_file(walked):
                if isinstance(item, ParseIssue):
                    severities[item.severity.value] += 1
                    sink.emit(item)
                    _maybe_abort(config, item)
                else:
                    kinds[item.kind] += 1
                    sink.emit(item)

    return RunSummary(
        files_parsed=files,
        facts=sum(kinds.values()),
        facts_by_kind=dict(kinds),
        issues_by_severity=dict(severities),
        duration_s=round(time.monotonic() - started, 3),
    )


def _validate_parser_types(modules: list[ModuleConfig]) -> None:
    """Fail before doing any work, not halfway through a codebase."""
    for module in modules:
        for binding in module.parsers:
            try:
                get_parser(binding.type)
            except RegistryError as exc:
                raise FatalRunError(str(exc)) from exc


def _parse_file(source: SourceFile) -> Iterator[Fact | ParseIssue]:
    parser = get_parser(source.parser_type)
    base = Provenance(
        module=source.module,
        file=source.rel_path,
        source_hash=source.source_hash,
        parser=parser.type,
        parser_version=parser.version,
        parsed_at=datetime.now(timezone.utc),
    )
    try:
        yield from parser.parse(source.text, base)
    except Exception as exc:  # a buggy parser must not take down the run
        yield ParseIssue(
            severity=Severity.ERROR,
            parser=parser.type,
            file=source.rel_path,
            message=f"parser raised {type(exc).__name__}: {exc}",
            provenance=base,
        )


def _maybe_abort(config: ParseConfig, issue: ParseIssue) -> None:
    if issue.severity == Severity.FATAL:
        raise FatalRunError(f"{issue.file}: {issue.message}")
    if config.options.fail_on == FailOn.ERROR and issue.severity == Severity.ERROR:
        raise FatalRunError(
            f"{issue.file}: {issue.message} (aborting: fail_on=error)"
        )
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_runner.py -v`
Expected: PASS — 6 passed

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/parsing/runner.py lineage-backend/tests/parsing/test_runner.py
git commit -m "feat(parsing): run lifecycle, RunSummary, failure semantics"
```

---

### Task 8: Indexes

**Files:**
- Create: `lineage-backend/app/parsing/index.py`
- Test: `lineage-backend/tests/parsing/test_index.py`

**Interfaces:**
- Consumes: `Fact` (Task 1).
- Produces:
  - `FIELD_KINDS: set[str]` — fact kinds that declare a field. Currently `{"field_decl"}`.
  - `build_field_index(facts: list[Fact]) -> dict` — the `fields.json` payload.
  - `build_evidence_index(facts: list[Fact]) -> dict` — the `evidence.idx` payload.
  - `write_indexes(facts: list[Fact], out_dir: Path) -> None` — writes both files.

**Important — read this before implementing:** field *discovery* is Phase 3, not this sub-project. No parser in scope emits `field_decl` facts, so `fields.json` will be **empty** after an XML-only run. That is correct and intended: the contract and the writer exist now, and Phase 3 populates them without touching this code. Do not fake field entries to make the file look populated.

The **evidence index** is fully functional now. It maps every searchable token in a fact — `subject`, each entry in `reads`/`writes`, and the provenance `symbol`, `file`, and `xpath` — to the fact indices that mention it. That is what lets a search for `Pricer.calc` or `/Order/Price` find everything that touches it.

- [ ] **Step 1: Write the failing tests**

Create `lineage-backend/tests/parsing/test_index.py`:

```python
import json
from datetime import datetime

from app.parsing.facts import Fact, Provenance
from app.parsing.index import (
    build_evidence_index,
    build_field_index,
    write_indexes,
)


def _fact(kind: str, subject: str, **kw) -> Fact:
    prov = Provenance(
        module=kw.pop("module", "pricing-core"),
        file=kw.pop("file", "Pricer.java"),
        source_hash="h",
        parser="java",
        parser_version="0.1.0",
        parsed_at=datetime(2026, 7, 14),
        symbol=kw.pop("symbol", None),
        xpath=kw.pop("xpath", None),
    )
    return Fact(kind=kind, subject=subject, provenance=prov, **kw)


def test_evidence_index_maps_subject_to_facts():
    facts = [_fact("assignment", "price")]
    index = build_evidence_index(facts)
    assert index["tokens"]["price"] == [0]


def test_evidence_index_maps_reads_and_writes():
    facts = [_fact("assignment", "price", reads=["base", "discount"], writes=["price"])]
    index = build_evidence_index(facts)
    assert index["tokens"]["base"] == [0]
    assert index["tokens"]["discount"] == [0]


def test_evidence_index_maps_symbol_file_and_xpath():
    facts = [
        _fact("assignment", "price", symbol="Pricer.calc"),
        _fact("template_match", "Price", xpath="/Order/Price", file="out.xsl"),
    ]
    index = build_evidence_index(facts)
    assert index["tokens"]["Pricer.calc"] == [0]
    assert index["tokens"]["/Order/Price"] == [1]
    assert index["tokens"]["out.xsl"] == [1]


def test_one_token_can_map_to_several_facts():
    facts = [
        _fact("call", "getBasePrice", symbol="Pricer.calc"),
        _fact("assignment", "price", symbol="Pricer.calc"),
    ]
    index = build_evidence_index(facts)
    assert index["tokens"]["Pricer.calc"] == [0, 1]


def test_evidence_index_keeps_the_facts_it_points_at():
    facts = [_fact("assignment", "price")]
    index = build_evidence_index(facts)
    assert index["facts"][0]["kind"] == "assignment"


def test_field_index_is_empty_when_no_parser_declares_fields():
    # Field discovery is Phase 3. An XML-only run legitimately finds no fields.
    facts = [_fact("element", "order"), _fact("attribute", "id")]
    assert build_field_index(facts) == {"fields": []}


def test_field_index_picks_up_field_decl_facts():
    facts = [
        _fact(
            "field_decl",
            "effective_unit_price",
            attrs={"group": "Pricing", "description": "Unit price after discount"},
        )
    ]
    index = build_field_index(facts)
    assert len(index["fields"]) == 1

    field = index["fields"][0]
    assert field["name"] == "effective_unit_price"
    assert field["module"] == "pricing-core"
    assert field["group"] == "Pricing"
    assert field["description"] == "Unit price after discount"
    assert field["fact_count"] == 1
    assert field["status"] == "parsed"


def test_field_fact_count_counts_every_fact_mentioning_the_field():
    facts = [
        _fact("field_decl", "price"),
        _fact("assignment", "price", writes=["price"]),
        _fact("call", "other"),
    ]
    field = build_field_index(facts)["fields"][0]
    assert field["fact_count"] == 2


def test_write_indexes_writes_both_files(tmp_path):
    write_indexes([_fact("element", "order")], tmp_path)

    fields = json.loads((tmp_path / "fields.json").read_text())
    evidence = json.loads((tmp_path / "evidence.idx").read_text())

    assert fields == {"fields": []}
    assert evidence["tokens"]["order"] == [0]
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_index.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.parsing.index'`

- [ ] **Step 3: Write the implementation**

Create `lineage-backend/app/parsing/index.py`:

```python
"""Facts -> the two indexes the UI reads.

evidence.idx is what makes the sidebar an investigation tool rather than a menu:
searching a symbol, file, or XPath finds every fact — and so every field — that
touches it.

fields.json will be EMPTY until a parser emits `field_decl` facts. Field
discovery is Phase 3; the contract and the writer exist now so Phase 3 can
populate them without changing this module. Do not fabricate entries.
"""
import json
from collections import defaultdict
from pathlib import Path

from app.parsing.facts import Fact

FIELD_KINDS: set[str] = {"field_decl"}


def build_evidence_index(facts: list[Fact]) -> dict:
    """token -> indices into `facts`, plus the facts themselves."""
    tokens: dict[str, list[int]] = defaultdict(list)

    for i, fact in enumerate(facts):
        for token in _tokens_of(fact):
            if i not in tokens[token]:
                tokens[token].append(i)

    return {
        "tokens": dict(tokens),
        "facts": [f.model_dump(mode="json") for f in facts],
    }


def build_field_index(facts: list[Fact]) -> dict:
    """One entry per declared field."""
    fields = []
    for fact in facts:
        if fact.kind not in FIELD_KINDS:
            continue
        name = fact.subject
        fields.append(
            {
                "name": name,
                "module": fact.provenance.module,
                "group": fact.attrs.get("group"),
                "description": fact.attrs.get("description"),
                "languages": sorted(
                    {
                        f.provenance.parser
                        for f in facts
                        if _mentions(f, name)
                    }
                ),
                "fact_count": sum(1 for f in facts if _mentions(f, name)),
                "status": "parsed",
            }
        )
    return {"fields": fields}


def write_indexes(facts: list[Fact], out_dir: Path) -> None:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "fields.json").write_text(
        json.dumps(build_field_index(facts), indent=2)
    )
    (out_dir / "evidence.idx").write_text(
        json.dumps(build_evidence_index(facts))
    )


def _tokens_of(fact: Fact) -> list[str]:
    tokens = [fact.subject, *fact.reads, *fact.writes, fact.provenance.file]
    if fact.provenance.symbol:
        tokens.append(fact.provenance.symbol)
    if fact.provenance.xpath:
        tokens.append(fact.provenance.xpath)
    return [t for t in tokens if t]


def _mentions(fact: Fact, name: str) -> bool:
    return name == fact.subject or name in fact.reads or name in fact.writes
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_index.py -v`
Expected: PASS — 9 passed

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/parsing/index.py lineage-backend/tests/parsing/test_index.py
git commit -m "feat(parsing): field and evidence indexes"
```

---

### Task 9: Embedder port

**Files:**
- Create: `lineage-backend/app/parsing/embedder.py`
- Test: `lineage-backend/tests/parsing/test_embedder.py`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `Embedder` protocol — `embed(texts: list[str]) -> list[list[float]]`.
  - `NullEmbedder` — returns `[]`. The **default**. Full-text search works without any embedder.
  - `LocalEmbedder(model: str = "voyage-4-nano")` — lazily imports `sentence_transformers`; raises `EmbedderUnavailable` with an actionable message if the optional extra is not installed.
  - `HostedEmbedder(api_key: str, model: str = "voyage-code-3")` — lazily imports `voyageai`; raises `EmbedderUnavailable` if not installed.
  - `get_embedder(mode: str = "none", **kw) -> Embedder` — `"none"` | `"local"` | `"hosted"`.
  - `EmbedderUnavailable(Exception)`

**Why this shape:** Anthropic has **no embeddings endpoint** (their docs point to Voyage AI), so semantic search cannot ride the user-provided LLM API. A hosted embedder would be a second mandatory external service, which `CLAUDE_INSTRUCTIONS.md` §2 forbids. So: the default is `none`, the recommended upgrade is a **local open-weight** model, and hosted is an explicit opt-in that sends source fragments off-machine. The ML libraries are an optional extra, never a base requirement — do **not** add them to `requirements.txt`.

- [ ] **Step 1: Write the failing tests**

Create `lineage-backend/tests/parsing/test_embedder.py`:

```python
import pytest

from app.parsing.embedder import (
    EmbedderUnavailable,
    HostedEmbedder,
    LocalEmbedder,
    NullEmbedder,
    get_embedder,
)


def test_default_is_the_null_embedder():
    embedder = get_embedder()
    assert isinstance(embedder, NullEmbedder)


def test_null_embedder_returns_no_vectors():
    # Full-text search must work with no embedder configured.
    assert NullEmbedder().embed(["price", "discount"]) == []


def test_unknown_mode_is_rejected():
    with pytest.raises(ValueError, match="unknown embedder mode"):
        get_embedder(mode="telepathy")


def test_local_embedder_reports_the_missing_optional_extra(monkeypatch):
    monkeypatch.setattr(
        "app.parsing.embedder._import_sentence_transformers",
        lambda: (_ for _ in ()).throw(ImportError("no module")),
    )
    with pytest.raises(EmbedderUnavailable, match="pip install"):
        LocalEmbedder().embed(["price"])


def test_hosted_embedder_reports_the_missing_optional_extra(monkeypatch):
    monkeypatch.setattr(
        "app.parsing.embedder._import_voyageai",
        lambda: (_ for _ in ()).throw(ImportError("no module")),
    )
    with pytest.raises(EmbedderUnavailable, match="pip install"):
        HostedEmbedder(api_key="k").embed(["price"])


def test_hosted_embedder_requires_an_api_key():
    with pytest.raises(ValueError, match="api_key"):
        HostedEmbedder(api_key="")
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_embedder.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'app.parsing.embedder'`

- [ ] **Step 3: Write the implementation**

Create `lineage-backend/app/parsing/embedder.py`:

```python
"""Optional semantic search.

Anthropic does not offer an embeddings endpoint — their docs point to Voyage AI
— so semantic search cannot ride on the user-provided LLM API. A hosted
embedder would therefore be a second mandatory external service, which
CLAUDE_INSTRUCTIONS.md §2 forbids.

Resolution: this is a port. The default is NullEmbedder (full-text search works
with no embedder at all). LocalEmbedder runs an open-weight model offline, with
nothing leaving the machine. HostedEmbedder is an explicit opt-in that sends
source fragments to a third party.

The ML libraries are an OPTIONAL EXTRA. They are deliberately not in
requirements.txt — installing them is what turns semantic search on.
"""
from typing import Protocol

LOCAL_MODEL = "voyage-4-nano"    # open-weight, Apache 2.0
HOSTED_MODEL = "voyage-code-3"   # hosted; better on a code corpus


class EmbedderUnavailable(Exception):
    """The optional ML extra is not installed."""


class Embedder(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]: ...


class NullEmbedder:
    """The default. Semantic search off; full-text search unaffected."""

    def embed(self, texts: list[str]) -> list[list[float]]:
        return []


class LocalEmbedder:
    """Open-weight model, run offline. Nothing leaves the machine."""

    def __init__(self, model: str = LOCAL_MODEL) -> None:
        self.model = model
        self._encoder = None

    def embed(self, texts: list[str]) -> list[list[float]]:
        if self._encoder is None:
            try:
                sentence_transformers = _import_sentence_transformers()
            except ImportError as exc:
                raise EmbedderUnavailable(
                    "local embeddings need the optional extra: "
                    "pip install sentence-transformers"
                ) from exc
            self._encoder = sentence_transformers.SentenceTransformer(self.model)
        return [list(v) for v in self._encoder.encode(texts)]


class HostedEmbedder:
    """Hosted Voyage. Sends source fragments off-machine — opt-in only."""

    def __init__(self, api_key: str, model: str = HOSTED_MODEL) -> None:
        if not api_key:
            raise ValueError("HostedEmbedder requires an api_key")
        self.api_key = api_key
        self.model = model
        self._client = None

    def embed(self, texts: list[str]) -> list[list[float]]:
        if self._client is None:
            try:
                voyageai = _import_voyageai()
            except ImportError as exc:
                raise EmbedderUnavailable(
                    "hosted embeddings need the optional extra: "
                    "pip install voyageai"
                ) from exc
            self._client = voyageai.Client(api_key=self.api_key)
        result = self._client.embed(texts, model=self.model, input_type="document")
        return result.embeddings


def get_embedder(mode: str = "none", **kwargs) -> Embedder:
    if mode == "none":
        return NullEmbedder()
    if mode == "local":
        return LocalEmbedder(**kwargs)
    if mode == "hosted":
        return HostedEmbedder(**kwargs)
    raise ValueError(f"unknown embedder mode {mode!r}: use none, local, or hosted")


# Indirected so tests can monkeypatch the import without touching sys.modules.
def _import_sentence_transformers():
    import sentence_transformers

    return sentence_transformers


def _import_voyageai():
    import voyageai

    return voyageai
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_embedder.py -v`
Expected: PASS — 6 passed

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/app/parsing/embedder.py lineage-backend/tests/parsing/test_embedder.py
git commit -m "feat(parsing): Embedder port with null default, local and hosted adapters"
```

---

### Task 10: CLI entrypoint

**Files:**
- Create: `lineage-backend/scripts/run_parse.py`
- Create: `lineage-backend/parse.config.example.yaml`
- Test: `lineage-backend/tests/parsing/test_cli.py`

**Interfaces:**
- Consumes: `load_config`, `ConfigError` (Task 2); `run`, `FatalRunError`, `RunSummary` (Task 7); `JsonlFactSink` (Task 5); `write_indexes` (Task 8).
- Produces:
  - `main(argv: list[str] | None = None) -> int` — the exit code. `0` on completion, `1` on `FatalRunError` or `ConfigError`.
  - `format_summary(summary: RunSummary, issues: list[ParseIssue]) -> str`

**Flags:** `--config PATH` (default `parse.config.yaml`), `--out DIR` (overrides `options.output_dir`), `--module NAME` (repeatable), `--fail-on {never,error}`, `-v`.

**Artifacts written to the output dir:** `facts.jsonl`, `fields.json`, `evidence.idx`, `run_summary.json`.

**Note:** the CLI must `import app.parsing.parsers.xml` so the `@register` decorator runs. Without that import the registry is empty and every run is a fatal unknown-type error.

- [ ] **Step 1: Write the failing tests**

Create `lineage-backend/tests/parsing/test_cli.py`:

```python
import json

from scripts.run_parse import main

CONFIG = """
version: 1
modules:
  - name: order-intake
    root: ./src
    parsers:
      - type: xml
        include: ["**/*.xml"]
options:
  output_dir: ./out
"""


def _project(tmp_path, config: str = CONFIG) -> str:
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "order.xml").write_text("<order><price>42</price></order>")
    path = tmp_path / "parse.config.yaml"
    path.write_text(config)
    return str(path)


def test_successful_run_exits_zero_and_writes_all_four_artifacts(tmp_path):
    code = main(["--config", _project(tmp_path)])
    assert code == 0

    out = tmp_path / "out"
    assert (out / "facts.jsonl").exists()
    assert (out / "fields.json").exists()
    assert (out / "evidence.idx").exists()
    assert (out / "run_summary.json").exists()

    summary = json.loads((out / "run_summary.json").read_text())
    assert summary["files_parsed"] == 1
    assert summary["facts_by_kind"]["element"] == 2


def test_out_flag_overrides_the_config_output_dir(tmp_path):
    elsewhere = tmp_path / "elsewhere"
    code = main(["--config", _project(tmp_path), "--out", str(elsewhere)])
    assert code == 0
    assert (elsewhere / "facts.jsonl").exists()


def test_missing_config_exits_one(tmp_path):
    assert main(["--config", str(tmp_path / "nope.yaml")]) == 1


def test_malformed_file_still_exits_zero_under_fail_on_never(tmp_path):
    config_path = _project(tmp_path)
    (tmp_path / "src" / "bad.xml").write_text("<order><unclosed></order>")

    assert main(["--config", config_path]) == 0

    summary = json.loads((tmp_path / "out" / "run_summary.json").read_text())
    assert summary["issues_by_severity"]["error"] == 1


def test_fail_on_error_flag_exits_one(tmp_path):
    config_path = _project(tmp_path)
    (tmp_path / "src" / "bad.xml").write_text("<order><unclosed></order>")

    assert main(["--config", config_path, "--fail-on", "error"]) == 1
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_cli.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'scripts.run_parse'`

- [ ] **Step 3: Write the implementation**

Create `lineage-backend/scripts/__init__.py` as an empty file (so `scripts.run_parse` is importable from tests).

Create `lineage-backend/parse.config.example.yaml`:

```yaml
# Copy to parse.config.yaml and point the roots at your source.
# Full field reference: docs/superpowers/specs/2026-07-14-parser-foundation-design.md
version: 1

modules:
  - name: order-intake
    root: ./src/intake
    parsers:
      - type: xml
        include: ["**/*.xml"]
        exclude: ["**/test/**"]

xsd_stores:
  - name: outbound
    root: ./schemas/out

options:
  encoding: utf-8
  fail_on: never       # never | error
  output_dir: ./out
```

Create `lineage-backend/scripts/run_parse.py`:

```python
"""Parse configured sources into facts, indexes, and a run summary.

    python scripts/run_parse.py --config parse.config.yaml
"""
import argparse
import json
import sys
from pathlib import Path

# Importing a parser module runs its @register decorator. Without this the
# registry is empty and every run fails with an unknown-type error.
import app.parsing.parsers.xml  # noqa: F401
from app.parsing.config import ConfigError, FailOn, load_config
from app.parsing.facts import Fact, ParseIssue
from app.parsing.index import write_indexes
from app.parsing.runner import FatalRunError, RunSummary, run
from app.parsing.sinks import FactSink


class _CollectingJsonlSink:
    """Writes facts.jsonl and keeps them in memory for the index builders."""

    def __init__(self, path: Path) -> None:
        from app.parsing.sinks import JsonlFactSink

        self._jsonl = JsonlFactSink(path)
        self.facts: list[Fact] = []
        self.issues: list[ParseIssue] = []

    def emit(self, item: Fact | ParseIssue) -> None:
        self._jsonl.emit(item)
        if isinstance(item, Fact):
            self.facts.append(item)
        else:
            self.issues.append(item)

    def close(self) -> None:
        self._jsonl.close()


def _parse_args(argv: list[str] | None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run a parse over configured sources.")
    parser.add_argument("--config", default="parse.config.yaml", help="config file")
    parser.add_argument("--out", default=None, help="override options.output_dir")
    parser.add_argument(
        "--module", action="append", default=None, help="parse only this module"
    )
    parser.add_argument("--fail-on", choices=["never", "error"], default=None)
    parser.add_argument("-v", action="store_true", help="verbose")
    return parser.parse_args(argv)


def format_summary(summary: RunSummary, issues: list[ParseIssue]) -> str:
    lines = [
        "",
        f"  {summary.files_parsed} files parsed · {summary.facts} facts",
    ]
    if summary.issues_by_severity:
        counts = " · ".join(
            f"{n} {sev}s" for sev, n in sorted(summary.issues_by_severity.items())
        )
        lines.append(f"  {counts}")
    for issue in issues:
        lines.append(f"  {issue.severity.value:<8}{issue.file} — {issue.message}")
    lines.append(f"  done in {summary.duration_s}s")
    lines.append("")
    return "\n".join(lines)


def main(argv: list[str] | None = None) -> int:
    args = _parse_args(argv)

    try:
        config = load_config(Path(args.config))
    except ConfigError as exc:
        print(f"config error: {exc}", file=sys.stderr)
        return 1

    if args.fail_on:
        config.options.fail_on = FailOn(args.fail_on)

    out_dir = Path(args.out) if args.out else config.resolve(config.options.output_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    sink = _CollectingJsonlSink(out_dir / "facts.jsonl")
    try:
        summary = run(config, sink, modules=args.module)
    except FatalRunError as exc:
        sink.close()
        print(f"run aborted: {exc}", file=sys.stderr)
        return 1
    finally:
        pass
    sink.close()

    write_indexes(sink.facts, out_dir)
    (out_dir / "run_summary.json").write_text(
        json.dumps(summary.model_dump(mode="json"), indent=2)
    )

    print(format_summary(summary, sink.issues))
    return 0


if __name__ == "__main__":
    sys.exit(main())
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd lineage-backend && python -m pytest tests/parsing/test_cli.py -v`
Expected: PASS — 5 passed

- [ ] **Step 5: Commit**

```bash
git add lineage-backend/scripts/__init__.py lineage-backend/scripts/run_parse.py lineage-backend/parse.config.example.yaml lineage-backend/tests/parsing/test_cli.py
git commit -m "feat(parsing): run_parse CLI and example config"
```

---

### Task 11: Rule-1 guard, parser guide, and CLAUDE.md

**Files:**
- Create: `lineage-backend/tests/parsing/test_rules.py`
- Create: `docs/PARSERS.md`
- Modify: `CLAUDE.md` (append a parsing section)

**Interfaces:**
- Consumes: everything.
- Produces: the developer guide sub-project #3 needs on day one.

- [ ] **Step 1: Write the failing test**

Create `lineage-backend/tests/parsing/test_rules.py`:

```python
"""Rule 1 is enforced structurally, not by convention.

'Deterministic parsing establishes facts. Do not rely on the LLM to discover
facts that can be extracted deterministically.' — CLAUDE_INSTRUCTIONS.md §3
"""
from pathlib import Path

FORBIDDEN = ("anthropic", "openai", "llm_client", "dataClient")

PARSING_DIR = Path(__file__).resolve().parents[2] / "app" / "parsing"


def test_no_llm_client_is_imported_anywhere_under_app_parsing():
    offenders = []
    for path in PARSING_DIR.rglob("*.py"):
        source = path.read_text().lower()
        for line in source.splitlines():
            stripped = line.strip()
            if not (stripped.startswith("import ") or stripped.startswith("from ")):
                continue
            if any(name in stripped for name in FORBIDDEN):
                offenders.append(f"{path.name}: {line.strip()}")

    assert offenders == [], (
        "Rule 1 violation — app/parsing must never import an LLM client:\n"
        + "\n".join(offenders)
    )


def test_the_parsing_package_actually_exists_so_this_test_is_not_vacuous():
    assert PARSING_DIR.is_dir()
    assert len(list(PARSING_DIR.rglob("*.py"))) >= 8
```

- [ ] **Step 2: Run the test to verify it passes**

This one is a guard, not a red-green cycle — it should pass immediately against the code you already wrote. If it fails, an LLM import crept in and must be removed.

Run: `cd lineage-backend && python -m pytest tests/parsing/test_rules.py -v`
Expected: PASS — 2 passed

- [ ] **Step 3: Run the whole suite**

Run: `cd lineage-backend && python -m pytest tests/ -v`
Expected: PASS — every test in `tests/parsing/` passes (60+), and the pre-existing `test_health.py` / `test_fields.py` / `test_impact.py` / `test_access.py` are unaffected.

- [ ] **Step 4: Write the parser guide**

Create `docs/PARSERS.md`:

````markdown
# Parser guide

How to add a parser to `lineage-backend/app/parsing/`.

## The contract

A parser emits **facts** — things it literally saw in the source. It never emits
lineage ("field A derives from field B"); deriving lineage from facts is the
tracing stage's job. This is what makes cross-language traces
(Java → XSLT → XSD) possible: no single parser ever sees both sides of a hop.

```python
class Parser(Protocol):
    type: ClassVar[str]     # matches the config `type:` binding
    version: ClassVar[str]  # recorded in every fact's provenance

    def parse(self, source: str, base: Provenance) -> Iterator[Fact | ParseIssue]: ...
```

Three rules a parser must follow:

1. **Never raise.** Malformed input yields a `ParseIssue(severity=ERROR)` and
   returns. A parse failure must become a visible, attributable gap — never a
   crashed run, and never a silent hole.
2. **Never import an LLM client.** Enforced by `tests/parsing/test_rules.py`.
3. **Always fill provenance.** `base` arrives with module, file, source_hash,
   parser, parser_version and parsed_at already set. Copy it with
   `base.model_copy(update={...})` and add the location fields you know:
   `line_start`, `line_end`, `symbol`, `xpath`.

## Adding one

1. Create `app/parsing/parsers/<name>.py`.
2. Decorate the class with `@register`. The `type` class var is the string the
   config binds to.
3. Import the module in `scripts/run_parse.py` so the decorator runs — an
   unimported parser is an unregistered parser.
4. Write golden-file tests: fixture in, expected fact list out, asserted against
   `InMemoryFactSink`. Copy the shape of `tests/parsing/test_xml_parser.py`.
5. Document your fact kinds in the table below. Nobody can consume facts they
   cannot look up.

```python
from app.parsing.registry import register

@register
class XsdParser:
    type = "xsd"
    version = "0.1.0"

    def parse(self, source: str, base: Provenance) -> Iterator[Fact | ParseIssue]:
        ...
```

## Fact kinds

Each parser owns its own vocabulary. `kind` is an open discriminator and `attrs`
carries the kind-specific payload, so a new parser adds kinds without changing
any core code. Register them here as you add them.

### `xml`

| kind | subject | attrs | provenance |
|---|---|---|---|
| `element` | element local name | `path`, `text` | `xpath`, `line_start` |
| `attribute` | attribute local name | `path`, `value` | `xpath`, `line_start` |

### `field_decl` (cross-parser)

Reserved. A fact of kind `field_decl` declares a field and is what populates
`fields.json`. **No parser emits it yet** — field discovery is Phase 3. Until
then `fields.json` is legitimately empty.

| kind | subject | attrs | provenance |
|---|---|---|---|
| `field_decl` | field name | `group`, `description` | wherever the field was declared |

## Testing

```bash
cd lineage-backend
python -m pytest tests/parsing/ -v
```

No test may touch MSSQL or Neo4j. The whole subsystem runs offline.
````

- [ ] **Step 5: Update CLAUDE.md**

Append this section to `CLAUDE.md`, immediately before the `## Known limitations / next` heading:

```markdown
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
  like a field with no lineage.
- `FactSink` is the seam: `JsonlFactSink` today, the Neo4j/MSSQL graph writer later, with
  no parser changes.
- Config is sources-and-bindings only (`parse.config.example.yaml`), never a DSL.
- Run: `python scripts/run_parse.py --config parse.config.yaml`. Emits `facts.jsonl`,
  `fields.json`, `evidence.idx`, `run_summary.json`.
- `fields.json` is **empty until Phase 3** — no parser emits `field_decl` facts yet. This is
  correct, not a bug.
- Semantic search is optional and defaults to off. Anthropic has **no embeddings endpoint**
  (their docs point to Voyage AI), so a hosted embedder would be a second mandatory external
  service, which CLAUDE_INSTRUCTIONS §2 forbids. `embedder.py` is a port: null default,
  local open-weight model, optional hosted adapter. ML libs are an optional extra, never in
  `requirements.txt`.
- Guide: `docs/PARSERS.md`. Spec: `docs/superpowers/specs/2026-07-14-parser-foundation-design.md`.
```

- [ ] **Step 6: Commit**

```bash
git add lineage-backend/tests/parsing/test_rules.py docs/PARSERS.md CLAUDE.md
git commit -m "docs(parsing): parser guide, Rule-1 guard test, CLAUDE.md"
```

---

## Done when

- `cd lineage-backend && python -m pytest tests/ -v` is green.
- `python scripts/run_parse.py --config parse.config.example.yaml` (with roots pointed at
  real sources) writes all four artifacts and prints a summary.
- A new parser can be added by reading `docs/PARSERS.md` alone.

## Deliberately not built

Graph writers (sub-project #2). XSD/XSLT/Java/document parsers (#3–#5). Field tracing
(Phase 4). The runtime LLM grounding pack (#6). `fields.json` stays empty until #3 lands a
parser that emits `field_decl`.
