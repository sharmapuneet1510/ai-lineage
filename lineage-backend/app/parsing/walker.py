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
