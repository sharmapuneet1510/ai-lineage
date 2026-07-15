"""Parse configured sources into facts, indexes, and a run summary.

    python scripts/run_parse.py --config parse.config.yaml
"""
import argparse
import json
import sys
from pathlib import Path

# Running this file directly (`python scripts/run_parse.py`) puts `scripts/`
# on sys.path, not the lineage-backend/ project root, so `import app...`
# below would fail with ModuleNotFoundError. Insert the project root (this
# script's parent's parent) before the app.* imports so both
# `python scripts/run_parse.py` and `python -m scripts.run_parse` work.
# Do NOT reorder this above the stdlib imports or move it after the app.*
# imports — the app.* imports below depend on it running first. Linters
# will flag "import not at top of file"; that is expected and intentional.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Importing a parser module runs its @register decorator. Without this the
# registry is empty and every run fails with an unknown-type error.
import app.parsing.parsers.xml  # noqa: F401,E402
from app.parsing.config import ConfigError, FailOn, load_config  # noqa: E402
from app.parsing.facts import Fact, ParseIssue  # noqa: E402
from app.parsing.index import write_indexes  # noqa: E402
from app.parsing.runner import FatalRunError, RunSummary, run  # noqa: E402
from app.parsing.sinks import JsonlFactSink  # noqa: E402


class _CollectingJsonlSink:
    """Writes facts.jsonl and keeps them in memory for the index builders."""

    def __init__(self, path: Path) -> None:
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
        print(f"run aborted: {exc}", file=sys.stderr)
        if exc.summary is not None:
            print(format_summary(exc.summary, sink.issues), file=sys.stderr)
            # A CI system parses run_summary.json after any run, fatal abort
            # included. Without this, a fatal abort leaves no summary file at
            # all even though a partial one was computed.
            (out_dir / "run_summary.json").write_text(
                json.dumps(exc.summary.model_dump(mode="json"), indent=2)
            )
        return 1
    finally:
        sink.close()

    write_indexes(sink.facts, out_dir)
    (out_dir / "run_summary.json").write_text(
        json.dumps(summary.model_dump(mode="json"), indent=2)
    )

    print(format_summary(summary, sink.issues))
    return 0


if __name__ == "__main__":
    sys.exit(main())
