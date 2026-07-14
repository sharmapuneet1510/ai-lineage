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
