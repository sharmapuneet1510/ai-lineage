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
