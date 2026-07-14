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
