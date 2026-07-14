from datetime import datetime

import pytest
from pydantic import ValidationError

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity


def _provenance() -> Provenance:
    return Provenance(
        module="pricing-core",
        file="src/pricing/Pricer.java",
        source_hash="ab12",
        parser="java",
        parser_version="0.1.0",
        parsed_at=datetime(2026, 7, 14, 9, 0, 0),
    )


def test_provenance_requires_module_file_hash_and_parser():
    with pytest.raises(ValidationError):
        Provenance(module="pricing-core")


def test_provenance_optional_location_fields_default_to_none():
    prov = _provenance()
    assert prov.line_start is None
    assert prov.line_end is None
    assert prov.symbol is None
    assert prov.xpath is None


def test_fact_requires_provenance():
    with pytest.raises(ValidationError):
        Fact(kind="assignment", subject="price")


def test_fact_defaults_reads_writes_and_attrs_to_empty():
    fact = Fact(kind="assignment", subject="price", provenance=_provenance())
    assert fact.reads == []
    assert fact.writes == []
    assert fact.attrs == {}


def test_fact_carries_kind_specific_payload_in_attrs():
    fact = Fact(
        kind="assignment",
        subject="price",
        reads=["base", "discount"],
        writes=["price"],
        attrs={"expr": "base*(1-discount)"},
        provenance=_provenance(),
    )
    assert fact.attrs["expr"] == "base*(1-discount)"
    assert fact.reads == ["base", "discount"]


def test_parse_issue_severity_values():
    assert Severity.WARNING == "warning"
    assert Severity.ERROR == "error"
    assert Severity.FATAL == "fatal"


def test_parse_issue_provenance_is_optional():
    issue = ParseIssue(
        severity=Severity.ERROR,
        parser="java",
        file="src/pricing/Rounding.java",
        message="UnicodeDecodeError at byte 0x9f",
    )
    assert issue.provenance is None
    assert issue.severity == Severity.ERROR
