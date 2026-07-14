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
