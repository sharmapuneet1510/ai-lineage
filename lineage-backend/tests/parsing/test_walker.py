import errno
import hashlib
import os
from pathlib import Path

import pytest

from app.parsing.config import ModuleConfig, Options, ParseConfig, ParserBinding
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


def test_exclude_deeply_nested_files(tmp_path):
    """Verify that deeply nested files (2+ levels) inside excluded directories are also excluded."""
    (tmp_path / "src" / "test" / "sub" / "deep").mkdir(parents=True)
    (tmp_path / "src" / "keep.xml").write_text("<a/>")
    (tmp_path / "src" / "test" / "skip.xml").write_text("<a/>")
    (tmp_path / "src" / "test" / "sub" / "deep.xml").write_text("<a/>")
    (tmp_path / "src" / "test" / "sub" / "deep" / "deeper.xml").write_text("<a/>")

    config, module = _config(
        tmp_path,
        ParserBinding(type="xml", include=["**/*.xml"], exclude=["**/test/**"]),
    )
    paths = sorted(r.rel_path for r in walk_module(module, config))

    assert paths == ["keep.xml"]


@pytest.mark.skipif(os.geteuid() == 0, reason="root bypasses permission bits")
def test_unreadable_file_yields_parse_issue_not_crash(tmp_path):
    """Verify that an unreadable file yields a ParseIssue and walk continues."""
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "good.xml").write_text("<a/>")
    unreadable = tmp_path / "src" / "bad.xml"
    unreadable.write_text("<b/>")
    unreadable.chmod(0o000)

    try:
        config, module = _config(
            tmp_path,
            ParserBinding(type="xml", include=["**/*.xml"]),
        )
        results = list(walk_module(module, config))

        # Should have one ParseIssue (for bad.xml) and one SourceFile (for good.xml)
        issues = [r for r in results if isinstance(r, ParseIssue)]
        source_files = [r for r in results if isinstance(r, SourceFile)]

        assert len(issues) == 1
        assert len(source_files) == 1
        assert issues[0].severity == Severity.ERROR
        assert issues[0].file == "bad.xml"
        assert "cannot read file" in issues[0].message.lower()
        assert source_files[0].rel_path == "good.xml"
    finally:
        # Restore permissions for cleanup
        unreadable.chmod(0o644)


def test_unknown_encoding_yields_parse_issue_not_crash(tmp_path):
    """Verify that an unknown encoding codec name yields a ParseIssue with correct message."""
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "a.xml").write_text("<a/>")

    config, module = _config(
        tmp_path,
        ParserBinding(type="xml", include=["**/*.xml"]),
    )
    # Override the encoding to an invalid codec name
    config.options.encoding = "utf8x"

    results = list(walk_module(module, config))

    assert len(results) == 1
    issue = results[0]
    assert isinstance(issue, ParseIssue)
    assert issue.severity == Severity.ERROR
    assert issue.file == "a.xml"
    assert "unknown encoding" in issue.message.lower()
    assert "utf8x" in issue.message


def test_stat_failure_yields_parse_issue_not_crash(tmp_path, monkeypatch):
    """Verify that a stat failure on one file doesn't crash walk and is yielded as ParseIssue.

    This test proves that Finding 1 is fixed: a PermissionError on is_file() is caught
    inside _matching_files, emitted as ParseIssue downstream, and other files continue
    to be processed.
    """
    from pathlib import Path

    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "good.xml").write_text("<a/>")
    (tmp_path / "src" / "bad.xml").write_text("<b/>")

    # Monkeypatch Path.is_file to raise PermissionError for bad.xml
    original_is_file = Path.is_file

    def patched_is_file(self):
        if "bad.xml" in str(self):
            raise PermissionError("mocked permission denied")
        return original_is_file(self)

    monkeypatch.setattr(Path, "is_file", patched_is_file)

    config, module = _config(
        tmp_path,
        ParserBinding(type="xml", include=["**/*.xml"]),
    )
    results = list(walk_module(module, config))

    # Should have one ParseIssue (for bad.xml) and one SourceFile (for good.xml)
    issues = [r for r in results if isinstance(r, ParseIssue)]
    source_files = [r for r in results if isinstance(r, SourceFile)]

    assert len(issues) == 1, f"Expected 1 issue, got {len(issues)}"
    assert len(source_files) == 1, f"Expected 1 source file, got {len(source_files)}"
    assert issues[0].severity == Severity.ERROR
    assert issues[0].file == "bad.xml"
    assert "stat" in issues[0].message.lower() or "permission" in issues[0].message.lower()
    assert source_files[0].rel_path == "good.xml"


def _patched_scandir_raising_for_subdir(subdir_name: str, exc: Exception):
    """Return an os.scandir replacement that raises `exc` when scanning the
    directory named `subdir_name`, and otherwise behaves normally.
    """
    original_scandir = os.scandir

    def patched(path="."):
        if str(path).rstrip(os.sep).endswith(subdir_name):
            raise exc
        return original_scandir(path)

    return patched, original_scandir


def test_include_glob_directory_scan_failure_yields_issue_not_crash(tmp_path, monkeypatch):
    """An OSError with an errno outside pathlib's ignored set (ESTALE), raised while
    the INCLUDE glob's generator scans a subdirectory, must not crash walk_module.

    Before the fix, `for p in root.glob(pattern):` in `_matching_files` had no
    try/except around the iteration itself (only around `p.is_file()` inside the
    loop body), so this OSError propagated straight out of `list(walk_module(...))`.
    """
    (tmp_path / "src" / "sub").mkdir(parents=True)
    (tmp_path / "src" / "sub" / "deep.xml").write_text("<deep/>")
    (tmp_path / "src" / "other.txt").write_text("plain text")

    module = ModuleConfig(
        name="m",
        root="./src",
        parsers=[
            # Recursive: this is the pattern whose scan into "sub" fails.
            ParserBinding(type="xml", include=["**/*.xml"]),
            # Non-recursive: never scans into "sub" at all, so this binding's
            # matches must be entirely unaffected by the other pattern's failure.
            ParserBinding(type="txt", include=["*.txt"]),
        ],
    )
    config = ParseConfig(
        version=1, modules=[module], options=Options(), config_dir=tmp_path
    )

    patched, original_scandir = _patched_scandir_raising_for_subdir(
        "sub", OSError(errno.ESTALE, "Stale file handle")
    )
    monkeypatch.setattr(os, "scandir", patched)

    # Must not raise.
    results = list(walk_module(module, config))

    issues = [r for r in results if isinstance(r, ParseIssue)]
    source_files = [r for r in results if isinstance(r, SourceFile)]

    scan_issues = [i for i in issues if "directory scan failed" in i.message.lower()]
    assert len(scan_issues) == 1
    assert scan_issues[0].severity == Severity.ERROR
    assert scan_issues[0].parser == "xml"
    assert "incomplete" in scan_issues[0].message.lower()

    # The other binding (unrelated pattern) must still have been processed.
    assert any(
        sf.parser_type == "txt" and sf.rel_path == "other.txt" for sf in source_files
    )


def test_exclude_glob_directory_scan_failure_yields_issue_not_crash(tmp_path, monkeypatch):
    """An OSError with an errno outside pathlib's ignored set (ESTALE), raised while
    the EXCLUDE glob's generator scans a subdirectory, must not crash walk_module.

    Before the fix, `excluded.update(root.glob(pattern))` had no guard at all, so
    this OSError propagated straight out of `list(walk_module(...))`.
    """
    (tmp_path / "src" / "sub").mkdir(parents=True)
    (tmp_path / "src" / "sub" / "deep.xml").write_text("<deep/>")
    (tmp_path / "src" / "keep.xml").write_text("<keep/>")
    (tmp_path / "src" / "other.txt").write_text("plain text")

    module = ModuleConfig(
        name="m",
        root="./src",
        parsers=[
            # Non-recursive include (never scans into "sub") + recursive exclude
            # (does scan into "sub", and that's the scan that fails). This
            # isolates the failure to the exclude side only.
            ParserBinding(
                type="xml", include=["*.xml"], exclude=["**/sub/**"]
            ),
            # Unrelated pattern that never touches "sub"; must be unaffected.
            ParserBinding(type="txt", include=["*.txt"]),
        ],
    )
    config = ParseConfig(
        version=1, modules=[module], options=Options(), config_dir=tmp_path
    )

    patched, original_scandir = _patched_scandir_raising_for_subdir(
        "sub", OSError(errno.ESTALE, "Stale file handle")
    )
    monkeypatch.setattr(os, "scandir", patched)

    # Must not raise.
    results = list(walk_module(module, config))

    issues = [r for r in results if isinstance(r, ParseIssue)]
    source_files = [r for r in results if isinstance(r, SourceFile)]

    scan_issues = [i for i in issues if "directory scan failed" in i.message.lower()]
    assert len(scan_issues) == 1
    assert scan_issues[0].severity == Severity.ERROR
    assert scan_issues[0].parser == "xml"
    assert "included" in scan_issues[0].message.lower()

    # keep.xml (outside the exclude subtree) is unaffected either way.
    assert any(sf.rel_path == "keep.xml" for sf in source_files)

    # The other binding (unrelated pattern) must still have been processed.
    assert any(
        sf.parser_type == "txt" and sf.rel_path == "other.txt" for sf in source_files
    )


def test_permission_error_during_glob_scan_is_swallowed_by_pathlib(tmp_path, monkeypatch):
    """A PermissionError raised by os.scandir while the glob generator scans a
    subdirectory is swallowed internally by pathlib's own selector machinery
    (unlike ESTALE/EIO/etc which propagate). Confirm this: walk_module does not
    raise, matches outside the unreadable subdirectory are still returned, and
    no ParseIssue is produced for it — the directory is simply skipped, exactly
    as if it had no matches.
    """
    (tmp_path / "src" / "sub").mkdir(parents=True)
    (tmp_path / "src" / "sub" / "bad.xml").write_text("<bad/>")
    (tmp_path / "src" / "good.xml").write_text("<good/>")

    config, module = _config(
        tmp_path, ParserBinding(type="xml", include=["**/*.xml"])
    )

    patched, original_scandir = _patched_scandir_raising_for_subdir(
        "sub", PermissionError(errno.EACCES, "Permission denied")
    )
    monkeypatch.setattr(os, "scandir", patched)

    results = list(walk_module(module, config))

    issues = [r for r in results if isinstance(r, ParseIssue)]
    source_files = [r for r in results if isinstance(r, SourceFile)]

    # pathlib swallows the PermissionError itself during iteration, so no
    # "directory scan failed" issue should be produced for it.
    assert not any("directory scan failed" in i.message.lower() for i in issues)
    assert [sf.rel_path for sf in source_files] == ["good.xml"]
