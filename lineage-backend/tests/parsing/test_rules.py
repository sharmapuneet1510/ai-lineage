"""Rule 1 is enforced structurally, not by convention.

'Deterministic parsing establishes facts. Do not rely on the LLM to discover
facts that can be extracted deterministically.' — CLAUDE_INSTRUCTIONS.md §3

This is a guard, not a red-green TDD test: it should pass immediately against
the code already written. If it ever fails, an LLM import has crept into
app/parsing/ and must be removed, not excepted.
"""
from pathlib import Path

FORBIDDEN = ("anthropic", "openai", "llm_client", "dataClient")

PARSING_DIR = Path(__file__).resolve().parents[2] / "app" / "parsing"


def test_no_llm_client_is_imported_anywhere_under_app_parsing():
    offenders = []
    for path in PARSING_DIR.rglob("*.py"):
        source = path.read_text().lower()
        for line in source.splitlines():
            stripped = line.strip()
            if not (stripped.startswith("import ") or stripped.startswith("from ")):
                continue
            if any(name in stripped for name in FORBIDDEN):
                offenders.append(f"{path.name}: {line.strip()}")

    assert offenders == [], (
        "Rule 1 violation — app/parsing must never import an LLM client:\n"
        + "\n".join(offenders)
    )


def test_the_parsing_package_actually_exists_so_this_test_is_not_vacuous():
    assert PARSING_DIR.is_dir()
    assert len(list(PARSING_DIR.rglob("*.py"))) >= 8
