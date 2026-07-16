"""The explain stage: parsed facts -> a grounded, provenance-carrying FieldDoc.

Never fabricates. A field with no producing fact is a gap — the LLM is not even
called for it, so the model can't invent a lineage that the parser never saw.
"""
from datetime import datetime, timezone

from app.enrich.llm import LLMClient
from app.enrich.models import FIELD_DOC_SCHEMA, FieldDoc, GenerationProvenance, PlainEnglish
from app.enrich.prompts import render_user


def is_produced(name: str, facts: list[dict]) -> bool:
    """True if some fact actually produces this field (subject, or in writes)."""
    for f in facts:
        if f.get("subject") == name or name in (f.get("writes") or []):
            return True
    return False


def enrich_field(
    name: str,
    facts: list[dict],
    llm: LLMClient,
    prompt: dict,
    group: str | None = None,
    verified_feedback: list[dict] | None = None,
) -> FieldDoc | None:
    """Generate documentation for one field. Returns None for a gap (no producing
    fact) — the caller records the gap, and the LLM is never invoked."""
    if not is_produced(name, facts):
        return None

    user = render_user(prompt, name, group, facts, verified_feedback)
    result = llm.generate_json(prompt["system"], user, FIELD_DOC_SCHEMA)

    hashes = sorted({
        (f.get("provenance") or {}).get("source_hash")
        for f in facts
        if (f.get("provenance") or {}).get("source_hash")
    })

    return FieldDoc(
        name=name,
        group=group,
        status="parsed",
        description=result["business_definition"],
        plain_english=PlainEnglish(**result["plain_english"]),
        technical_summary=result["technical_summary"],
        generation=GenerationProvenance(
            prompt_id=prompt["id"],
            prompt_version=prompt["version"],
            model=llm.model,
            evidence_hashes=hashes,
            fact_count=len(facts),
            generated_at=datetime.now(timezone.utc),
        ),
    )
