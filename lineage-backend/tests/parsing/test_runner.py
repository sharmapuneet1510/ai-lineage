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
