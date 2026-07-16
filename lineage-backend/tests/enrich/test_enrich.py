import json

import pytest

from app.enrich.enrich import enrich_field, is_produced
from app.enrich.llm import FakeLLMClient, StubLLMClient
from app.enrich.models import FieldDoc
from app.enrich.prompts import PromptError, get_prompt, render_user

CANNED = {
    "business_definition": "The unit price after discount.",
    "plain_english": {"what": "unit price", "when": "base times one minus discount", "why": "reporting"},
    "technical_summary": "Produced in Java and mapped via XSLT.",
}


def _fact(kind, subject, reads=None, writes=None, expr=None, module="pricing-core", file="Pricer.java", parser="java", hash="ab12"):
    return {
        "kind": kind, "subject": subject, "reads": reads or [], "writes": writes or [],
        "attrs": ({"expr": expr} if expr else {}),
        "provenance": {"module": module, "file": file, "parser": parser, "source_hash": hash,
                       "symbol": "Pricer.calc", "line_start": 41, "xpath": None},
    }


PRICE_FACTS = [
    _fact("assignment", "price", reads=["base", "discount"], writes=["price"], expr="base*(1-discount)"),
    _fact("call", "base", reads=["order"], writes=["base"], expr="order.getBasePrice()"),
]


# ---- prompt registry ----------------------------------------------------

def test_prompt_has_id_and_version():
    p = get_prompt("field_explain")
    assert p["id"] == "field_explain" and p["version"] == "1"
    assert "only" in p["system"].lower()  # grounding instruction present


def test_unknown_prompt_raises():
    with pytest.raises(PromptError):
        get_prompt("nope")


def test_rendered_prompt_grounds_on_this_fields_facts():
    user = render_user(get_prompt("field_explain"), "price", "pricing-core", PRICE_FACTS)
    assert "Field: price" in user
    assert "base*(1-discount)" in user           # the field's own transformation is present
    assert "ground truth" in user.lower()


def test_rendered_prompt_includes_verified_feedback_when_given():
    fb = [{"kind": "correct", "body": "discount applies before tax"}]
    user = render_user(get_prompt("field_explain"), "price", None, PRICE_FACTS, verified_feedback=fb)
    assert "discount applies before tax" in user


# ---- gap safety ---------------------------------------------------------

def test_is_produced():
    assert is_produced("price", PRICE_FACTS)
    assert not is_produced("rounding", PRICE_FACTS)  # only ever read, never produced


def test_gap_field_is_not_sent_to_the_llm():
    # a field read but never produced must not be generated — no invention
    facts = [_fact("assignment", "final_total", reads=["price", "rounding"], writes=["final_total"])]
    llm = FakeLLMClient(CANNED)
    doc = enrich_field("rounding", facts, llm, get_prompt("field_explain"))
    assert doc is None
    assert llm.calls == []  # the model was never called for the gap


# ---- generation ---------------------------------------------------------

def test_enrich_produces_a_field_doc_with_generation_provenance():
    llm = FakeLLMClient(CANNED, model="claude-opus-4-8")
    doc = enrich_field("price", PRICE_FACTS, llm, get_prompt("field_explain"), group="Pricing")
    assert isinstance(doc, FieldDoc)
    assert doc.description == "The unit price after discount."
    assert doc.plain_english.what == "unit price"
    assert doc.group == "Pricing"
    # provenance on the generated doc
    g = doc.generation
    assert g.model == "claude-opus-4-8"
    assert g.prompt_id == "field_explain" and g.prompt_version == "1"
    assert g.fact_count == 2
    assert g.evidence_hashes == ["ab12"]  # deduped source hashes of the grounding facts
    assert g.generated_at is not None


def test_llm_was_called_exactly_once_for_a_produced_field():
    llm = FakeLLMClient(CANNED)
    enrich_field("price", PRICE_FACTS, llm, get_prompt("field_explain"))
    assert len(llm.calls) == 1


def test_field_doc_serialises_to_viewer_shape():
    llm = FakeLLMClient(CANNED)
    doc = enrich_field("price", PRICE_FACTS, llm, get_prompt("field_explain"), group="Pricing")
    row = doc.model_dump(mode="json")
    # the keys the static viewer reads
    for key in ("name", "group", "status", "description", "plain_english"):
        assert key in row
    assert row["plain_english"]["what"] == "unit price"
    assert row["generation"]["model"] == "fake"


def test_stub_client_runs_without_an_api_key():
    llm = StubLLMClient()
    doc = enrich_field("price", PRICE_FACTS, llm, get_prompt("field_explain"))
    assert doc.generation.model == "stub"
    assert "[stub]" in doc.description


# ---- CLI merge ----------------------------------------------------------

def test_run_enrich_writes_fields_json(tmp_path):
    from scripts.run_enrich import main
    # a minimal evidence.idx like the parser emits
    (tmp_path / "evidence.idx").write_text(json.dumps({"tokens": {}, "facts": PRICE_FACTS}))
    code = main(["--out", str(tmp_path), "--stub"])
    assert code == 0
    fields = json.loads((tmp_path / "fields.json").read_text())["fields"]
    names = {f["name"] for f in fields}
    assert "price" in names
    price = next(f for f in fields if f["name"] == "price")
    assert price["description"].startswith("[stub]")
    assert price["generation"]["prompt_id"] == "field_explain"


def test_run_enrich_preserves_existing_fields_json_entries(tmp_path):
    from scripts.run_enrich import main
    (tmp_path / "evidence.idx").write_text(json.dumps({"tokens": {}, "facts": PRICE_FACTS}))
    (tmp_path / "fields.json").write_text(json.dumps({"fields": [{"name": "kept", "note": "x"}]}))
    main(["--out", str(tmp_path), "--stub"])
    fields = {f["name"]: f for f in json.loads((tmp_path / "fields.json").read_text())["fields"]}
    assert "kept" in fields and fields["kept"]["note"] == "x"  # untouched
    assert "price" in fields                                    # added
