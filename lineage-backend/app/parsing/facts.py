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
