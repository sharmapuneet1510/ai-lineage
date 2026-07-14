import json
from datetime import datetime

from app.parsing.facts import Fact, Provenance
from app.parsing.index import (
    build_evidence_index,
    build_field_index,
    write_indexes,
)


def _fact(kind: str, subject: str, **kw) -> Fact:
    prov = Provenance(
        module=kw.pop("module", "pricing-core"),
        file=kw.pop("file", "Pricer.java"),
        source_hash="h",
        parser="java",
        parser_version="0.1.0",
        parsed_at=datetime(2026, 7, 14),
        symbol=kw.pop("symbol", None),
        xpath=kw.pop("xpath", None),
    )
    return Fact(kind=kind, subject=subject, provenance=prov, **kw)


def test_evidence_index_maps_subject_to_facts():
    facts = [_fact("assignment", "price")]
    index = build_evidence_index(facts)
    assert index["tokens"]["price"] == [0]


def test_evidence_index_maps_reads_and_writes():
    facts = [_fact("assignment", "price", reads=["base", "discount"], writes=["price"])]
    index = build_evidence_index(facts)
    assert index["tokens"]["base"] == [0]
    assert index["tokens"]["discount"] == [0]


def test_evidence_index_maps_symbol_file_and_xpath():
    facts = [
        _fact("assignment", "price", symbol="Pricer.calc"),
        _fact("template_match", "Price", xpath="/Order/Price", file="out.xsl"),
    ]
    index = build_evidence_index(facts)
    assert index["tokens"]["Pricer.calc"] == [0]
    assert index["tokens"]["/Order/Price"] == [1]
    assert index["tokens"]["out.xsl"] == [1]


def test_one_token_can_map_to_several_facts():
    facts = [
        _fact("call", "getBasePrice", symbol="Pricer.calc"),
        _fact("assignment", "price", symbol="Pricer.calc"),
    ]
    index = build_evidence_index(facts)
    assert index["tokens"]["Pricer.calc"] == [0, 1]


def test_evidence_index_keeps_the_facts_it_points_at():
    facts = [_fact("assignment", "price")]
    index = build_evidence_index(facts)
    assert index["facts"][0]["kind"] == "assignment"


def test_field_index_is_empty_when_no_parser_declares_fields():
    # Field discovery is Phase 3. An XML-only run legitimately finds no fields.
    facts = [_fact("element", "order"), _fact("attribute", "id")]
    assert build_field_index(facts) == {"fields": []}


def test_field_index_picks_up_field_decl_facts():
    facts = [
        _fact(
            "field_decl",
            "effective_unit_price",
            attrs={"group": "Pricing", "description": "Unit price after discount"},
        )
    ]
    index = build_field_index(facts)
    assert len(index["fields"]) == 1

    field = index["fields"][0]
    assert field["name"] == "effective_unit_price"
    assert field["module"] == "pricing-core"
    assert field["group"] == "Pricing"
    assert field["description"] == "Unit price after discount"
    assert field["fact_count"] == 1
    assert field["status"] == "parsed"


def test_field_fact_count_counts_every_fact_mentioning_the_field():
    facts = [
        _fact("field_decl", "price"),
        _fact("assignment", "price", writes=["price"]),
        _fact("call", "other"),
    ]
    field = build_field_index(facts)["fields"][0]
    assert field["fact_count"] == 2


def test_write_indexes_writes_both_files(tmp_path):
    write_indexes([_fact("element", "order")], tmp_path)

    fields = json.loads((tmp_path / "fields.json").read_text())
    evidence = json.loads((tmp_path / "evidence.idx").read_text())

    assert fields == {"fields": []}
    assert evidence["tokens"]["order"] == [0]
