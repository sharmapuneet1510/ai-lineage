"""Configurable, versioned prompt registry.

Each prompt has an id + version recorded on every generated document, so a
change in wording is traceable in the output's provenance. Adding or revising a
prompt is a config concern, not a code change to the enrich logic.
"""
import json

_PROMPTS: dict[str, dict] = {
    "field_explain": {
        "id": "field_explain",
        "version": "1",
        "system": (
            "You document data-lineage fields for an audit tool. You are given the "
            "parsed FACTS for one field — statements a deterministic parser literally "
            "observed in source code. Explain the field using ONLY those facts.\n\n"
            "Rules:\n"
            "1. Use only the provided facts. Never invent logic, values, transformations, "
            "sources, or downstream systems that are not present in the facts.\n"
            "2. If the facts are insufficient to describe some aspect, say so plainly "
            "rather than guessing.\n"
            "3. If the facts show the field is read somewhere but never produced, treat its "
            "lineage as INCOMPLETE and say so in each section — do not fill the gap.\n"
            "4. Explain meaning in business terms; do not merely restate file/line "
            "coordinates.\n"
            "Return JSON matching the requested schema."
        ),
    }
}


class PromptError(Exception):
    pass


def get_prompt(name: str) -> dict:
    if name not in _PROMPTS:
        raise PromptError(f"unknown prompt {name!r}; known: {sorted(_PROMPTS)}")
    return _PROMPTS[name]


def render_user(prompt: dict, name: str, group: str | None,
                facts: list[dict], verified_feedback: list[dict] | None = None) -> str:
    """Build the grounded user message. The facts ARE the ground truth."""
    lines = [f"Field: {name}"]
    if group:
        lines.append(f"Group/module: {group}")
    lines.append("\nParsed facts (the ONLY ground truth):")
    lines.append(json.dumps(_trim(facts), indent=2))

    if verified_feedback:
        lines.append("\nVerified reviewer feedback (human-confirmed; prefer it on conflict):")
        lines.append(json.dumps(verified_feedback, indent=2))

    lines.append(
        "\nProduce a JSON document with:\n"
        "- business_definition: one paragraph — what this field is, grounded in the facts.\n"
        "- plain_english: {what, when, why}. 'what' = what it records; 'when' = when/how it is "
        "derived, reflecting any conditions or transformations present in the facts; 'why' = why "
        "it matters, only if the facts support it.\n"
        "- technical_summary: one or two sentences on how it is produced across the observed "
        "files and languages."
    )
    return "\n".join(lines)


def _trim(facts: list[dict]) -> list[dict]:
    """Send the model the parts of each fact that carry meaning, not the whole blob."""
    out = []
    for f in facts:
        pv = f.get("provenance", {}) or {}
        out.append({
            "kind": f.get("kind"),
            "subject": f.get("subject"),
            "reads": f.get("reads", []),
            "writes": f.get("writes", []),
            "attrs": f.get("attrs", {}),
            "at": {k: pv.get(k) for k in ("module", "file", "symbol", "line_start", "xpath", "parser") if pv.get(k) is not None},
        })
    return out
