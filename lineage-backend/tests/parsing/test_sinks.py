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
