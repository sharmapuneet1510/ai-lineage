"""Output of the explain stage.

The LLM explains parsed facts — it never discovers them (Rule 1/2). Every
generated document carries its own provenance (which prompt, which model, which
evidence it was grounded on) and is stored SEPARATELY from the parsed facts it
describes, so it can never silently overwrite deterministic knowledge (Rule 3).
"""
from datetime import datetime

from pydantic import BaseModel


class PlainEnglish(BaseModel):
    what: str
    when: str | None = None
    why: str


class GenerationProvenance(BaseModel):
    """How this document was produced — the AI counterpart of a fact's Provenance."""

    prompt_id: str
    prompt_version: str
    model: str
    evidence_hashes: list[str]   # source hashes of the facts this was grounded on
    fact_count: int
    generated_at: datetime


class FieldDoc(BaseModel):
    """A field's generated documentation. Serialises into fields.json, which the
    viewer already reads (name, group, status, description, plain_english)."""

    name: str
    group: str | None = None
    status: str = "parsed"
    description: str
    plain_english: PlainEnglish
    technical_summary: str
    generation: GenerationProvenance


# JSON schema handed to the model for structured output. Grounded fields only —
# downstream systems and tickets come from facts/feedback, not the LLM.
FIELD_DOC_SCHEMA: dict = {
    "type": "object",
    "properties": {
        "business_definition": {"type": "string"},
        "plain_english": {
            "type": "object",
            "properties": {
                "what": {"type": "string"},
                "when": {"type": "string"},
                "why": {"type": "string"},
            },
            "required": ["what", "when", "why"],
            "additionalProperties": False,
        },
        "technical_summary": {"type": "string"},
    },
    "required": ["business_definition", "plain_english", "technical_summary"],
    "additionalProperties": False,
}
