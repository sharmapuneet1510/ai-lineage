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

    Never raises: all parse failures yield ParseIssue(severity=ERROR).
    """
    root = config.resolve(module.root)
    for binding in module.parsers:
        matched_files, failed_paths, glob_failures = _matching_files(root, binding)

        # Emit issues for files that couldn't be stat'd (before per-file read errors)
        for abs_path, error_msg in failed_paths:
            rel_path = abs_path.relative_to(root).as_posix()
            yield ParseIssue(
                severity=Severity.ERROR,
                parser=binding.type,
                file=rel_path,
                message=f"cannot stat file: {error_msg}",
            )

        # Emit issues for directory-scan (glob iteration) failures. These are
        # distinct from a single bad file: once a glob generator raises mid-scan
        # it is dead and cannot resume, so an entire subtree of matches may be
        # missing (include side) or an entire subtree of would-be exclusions may
        # be missing (exclude side, meaning files that should have been
        # excluded may instead get parsed).
        for side, pattern, error_msg in glob_failures:
            if side == "include":
                message = (
                    f"directory scan failed while matching include pattern "
                    f"{pattern!r}: {error_msg}. Matches under this pattern may be "
                    f"incomplete — some files in this subtree may be missing from "
                    f"the lineage results."
                )
            else:
                message = (
                    f"directory scan failed while matching exclude pattern "
                    f"{pattern!r}: {error_msg}. Files under this subtree that "
                    f"should have been excluded may instead have been INCLUDED "
                    f"and parsed."
                )
            yield ParseIssue(
                severity=Severity.ERROR,
                parser=binding.type,
                file=pattern,
                message=message,
            )

        # Process matched files
        for abs_path in matched_files:
            rel_path = abs_path.relative_to(root).as_posix()
            try:
                data = abs_path.read_bytes()
            except OSError as exc:
                yield ParseIssue(
                    severity=Severity.ERROR,
                    parser=binding.type,
                    file=rel_path,
                    message=(
                        f"cannot read file: {exc}"
                    ),
                )
                continue
            try:
                text = data.decode(config.options.encoding)
            except (UnicodeDecodeError, LookupError) as exc:
                if isinstance(exc, LookupError):
                    message = f"unknown encoding {config.options.encoding!r}: {exc}"
                else:
                    message = f"cannot decode as {config.options.encoding}: {exc}"
                yield ParseIssue(
                    severity=Severity.ERROR,
                    parser=binding.type,
                    file=rel_path,
                    message=message,
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


def _matching_files(
    root: Path, binding: ParserBinding
) -> tuple[list[Path], list[tuple[Path, str]], list[tuple[str, str, str]]]:
    """Match files by binding globs, catching stat errors AND directory-scan errors.

    `Path.glob()` returns a generator. Its selector machinery swallows only
    PermissionError and a small set of ignored errnos (ENOENT, ENOTDIR, EBADF,
    ELOOP) internally. Any OTHER OSError raised while advancing the generator
    between yields (e.g. ESTALE from a stale NFS handle, EIO from a failing
    disk) propagates out of the `for` statement itself — not out of any call
    inside the loop body. That has to be guarded around the iteration, not
    just around per-item work like `is_file()`.

    A malformed or absolute pattern (`ValueError` / `NotImplementedError`) is
    normally rejected at config-load time (`config._reject_bad_glob_patterns`)
    before it ever reaches here. The except clause below also catches those as
    a belt-and-suspenders backstop, so even a pattern that somehow slips past
    config validation becomes a ParseIssue instead of a crash.

    Returns:
        (matched_files, failed_paths, glob_failures)
        - failed_paths: [(abs_path, error_msg), ...] for files that could not be
          stat'd (e.g. is_file() raised). Glob order.
        - glob_failures: [(side, pattern, error_msg), ...] where side is
          "include" or "exclude", for patterns whose directory scan itself
          raised mid-iteration. Because a dead generator cannot resume, matches
          for that pattern may be incomplete.
        Matched files are sorted; failed paths and glob_failures are in
        encounter order.
    """
    included: set[Path] = set()
    failed: list[tuple[Path, str]] = []
    glob_failures: list[tuple[str, str, str]] = []

    for pattern in binding.include:
        try:
            for p in root.glob(pattern):
                try:
                    if p.is_file():
                        included.add(p)
                except OSError as exc:
                    # Stat failure (e.g., PermissionError, ESTALE). Collect it and continue.
                    failed.append((p, str(exc)))
        except (OSError, ValueError, NotImplementedError) as exc:
            # The glob generator itself raised while scanning a directory, or
            # (belt-and-suspenders — config-load validation is the primary
            # gate) the pattern itself was malformed/absolute. Whatever was
            # matched before the raise is already in `included`; the rest of
            # this pattern's matches are lost.
            glob_failures.append(("include", pattern, str(exc)))

    excluded: set[Path] = set()
    for pattern in binding.exclude:
        try:
            for p in root.glob(pattern):
                excluded.add(p)
        except (OSError, ValueError, NotImplementedError) as exc:
            glob_failures.append(("exclude", pattern, str(exc)))

    kept = [
        p
        for p in included
        if not any(p == e or e in p.parents for e in excluded)
    ]
    return sorted(kept), failed, glob_failures
