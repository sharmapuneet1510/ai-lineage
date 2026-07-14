"""Facts -> the two indexes the UI reads.

evidence.idx is what makes the sidebar an investigation tool rather than a menu:
searching a symbol, file, or XPath finds every fact — and so every field — that
touches it.

fields.json will be EMPTY until a parser emits `field_decl` facts. Field
discovery is Phase 3; the contract and the writer exist now so Phase 3 can
populate them without changing this module. Do not fabricate entries.
"""
import json
from collections import defaultdict
from pathlib import Path

from app.parsing.facts import Fact

FIELD_KINDS: set[str] = {"field_decl"}


def build_evidence_index(facts: list[Fact]) -> dict:
    """token -> indices into `facts`, plus the facts themselves."""
    tokens: dict[str, list[int]] = defaultdict(list)

    for i, fact in enumerate(facts):
        for token in _tokens_of(fact):
            if i not in tokens[token]:
                tokens[token].append(i)

    return {
        "tokens": dict(tokens),
        "facts": [f.model_dump(mode="json") for f in facts],
    }


def build_field_index(facts: list[Fact]) -> dict:
    """One entry per declared field."""
    fields = []
    for fact in facts:
        if fact.kind not in FIELD_KINDS:
            continue
        name = fact.subject
        fields.append(
            {
                "name": name,
                "module": fact.provenance.module,
                "group": fact.attrs.get("group"),
                "description": fact.attrs.get("description"),
                "languages": sorted(
                    {
                        f.provenance.parser
                        for f in facts
                        if _mentions(f, name)
                    }
                ),
                "fact_count": sum(1 for f in facts if _mentions(f, name)),
                "status": "parsed",
            }
        )
    return {"fields": fields}


def write_indexes(facts: list[Fact], out_dir: Path) -> None:
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "fields.json").write_text(
        json.dumps(build_field_index(facts), indent=2)
    )
    (out_dir / "evidence.idx").write_text(
        json.dumps(build_evidence_index(facts))
    )


def _tokens_of(fact: Fact) -> list[str]:
    tokens = [fact.subject, *fact.reads, *fact.writes, fact.provenance.file]
    if fact.provenance.symbol:
        tokens.append(fact.provenance.symbol)
    if fact.provenance.xpath:
        tokens.append(fact.provenance.xpath)
    return [t for t in tokens if t]


def _mentions(fact: Fact, name: str) -> bool:
    return name == fact.subject or name in fact.reads or name in fact.writes
