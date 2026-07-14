from datetime import datetime

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.parsers.xml import XmlParser

SAMPLE = """<?xml version="1.0"?>
<order id="A-1">
  <price currency="USD">42.50</price>
</order>
"""


def _prov() -> Provenance:
    return Provenance(
        module="order-intake",
        file="order.xml",
        source_hash="h",
        parser="xml",
        parser_version="0.1.0",
        parsed_at=datetime(2026, 7, 14),
    )


def _parse(source: str) -> list[Fact | ParseIssue]:
    return list(XmlParser().parse(source, _prov()))


def test_parser_declares_its_type_and_version():
    assert XmlParser.type == "xml"
    assert XmlParser.version == "0.1.0"


def test_emits_an_element_fact_per_element():
    facts = [f for f in _parse(SAMPLE) if isinstance(f, Fact) and f.kind == "element"]
    subjects = sorted(f.subject for f in facts)
    assert subjects == ["order", "price"]


def test_element_fact_carries_xpath_and_line_in_provenance():
    facts = [f for f in _parse(SAMPLE) if isinstance(f, Fact) and f.kind == "element"]
    price = next(f for f in facts if f.subject == "price")
    assert price.provenance.xpath == "/order/price"
    assert price.provenance.line_start == 3
    assert price.attrs["text"] == "42.50"


def test_root_element_has_no_text_payload():
    facts = [f for f in _parse(SAMPLE) if isinstance(f, Fact) and f.kind == "element"]
    order = next(f for f in facts if f.subject == "order")
    assert order.attrs["text"] is None
    assert order.provenance.xpath == "/order"


def test_emits_an_attribute_fact_per_attribute():
    facts = [f for f in _parse(SAMPLE) if isinstance(f, Fact) and f.kind == "attribute"]
    pairs = sorted((f.subject, f.attrs["value"]) for f in facts)
    assert pairs == [("currency", "USD"), ("id", "A-1")]


def test_attribute_xpath_points_at_the_attribute():
    facts = [f for f in _parse(SAMPLE) if isinstance(f, Fact) and f.kind == "attribute"]
    currency = next(f for f in facts if f.subject == "currency")
    assert currency.provenance.xpath == "/order/price/@currency"


def test_every_fact_carries_the_base_provenance():
    for item in _parse(SAMPLE):
        assert isinstance(item, Fact)
        assert item.provenance.module == "order-intake"
        assert item.provenance.file == "order.xml"
        assert item.provenance.source_hash == "h"
        assert item.provenance.parser == "xml"


def test_malformed_xml_yields_an_error_issue_and_no_facts():
    results = _parse("<order><unclosed></order>")
    assert len(results) == 1
    issue = results[0]
    assert isinstance(issue, ParseIssue)
    assert issue.severity == Severity.ERROR
    assert issue.parser == "xml"
    assert issue.file == "order.xml"
    assert issue.provenance is not None


def test_namespaced_elements_use_the_local_name():
    source = '<o:order xmlns:o="urn:x"><o:price>1</o:price></o:order>'
    facts = [f for f in _parse(source) if isinstance(f, Fact) and f.kind == "element"]
    assert sorted(f.subject for f in facts) == ["order", "price"]


def test_billion_laughs_yields_an_error_issue_and_does_not_expand():
    # Small, bounded nesting (10x per level, 4 levels = 10^4 = 10,000x, not
    # gigabytes) — enough to prove entities are never expanded at all. If
    # the hardening regressed to entity expansion this would still be fast
    # and small, but the assertions below would fail because real element
    # facts referencing the expanded "lol" text would appear.
    payload = """<?xml version="1.0"?>
<!DOCTYPE lolz [
 <!ENTITY a "lol">
 <!ENTITY b "&a;&a;&a;&a;&a;&a;&a;&a;&a;&a;">
 <!ENTITY c "&b;&b;&b;&b;&b;&b;&b;&b;&b;&b;">
 <!ENTITY d "&c;&c;&c;&c;&c;&c;&c;&c;&c;&c;">
]>
<lolz>&d;</lolz>
"""
    results = _parse(payload)
    assert len(results) == 1
    issue = results[0]
    assert isinstance(issue, ParseIssue)
    assert issue.severity == Severity.ERROR
    assert issue.parser == "xml"
    assert issue.file == "order.xml"
    # No element/attribute facts were produced from the expanded entity.
    assert not [f for f in results if isinstance(f, Fact)]


def test_external_entity_is_not_resolved_into_facts():
    payload = """<?xml version="1.0"?>
<!DOCTYPE r [
 <!ENTITY xxe SYSTEM "file:///etc/passwd">
]>
<r><a>&xxe;</a></r>
"""
    results = _parse(payload)
    facts = [f for f in results if isinstance(f, Fact)]
    # The file's contents must never show up anywhere in emitted facts.
    for fact in facts:
        assert "root:" not in str(fact.attrs.get("text"))
        assert "root:" not in str(fact.attrs.get("value"))
    # And nothing in the emitted output resolves/echoes the entity value.
    assert all("root:" not in str(item) for item in results)


def test_hardening_does_not_change_well_formed_xml_behavior():
    # Regression guard: the hardened parser must emit exactly the same
    # element/attribute facts for ordinary, entity-free XML as before.
    facts = [f for f in _parse(SAMPLE) if isinstance(f, Fact)]
    element_subjects = sorted(f.subject for f in facts if f.kind == "element")
    attribute_pairs = sorted(
        (f.subject, f.attrs["value"]) for f in facts if f.kind == "attribute"
    )
    assert element_subjects == ["order", "price"]
    assert attribute_pairs == [("currency", "USD"), ("id", "A-1")]
