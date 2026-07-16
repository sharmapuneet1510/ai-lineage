from datetime import datetime

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.parsers.xsd import XsdParser

SCHEMA = """<?xml version="1.0"?>
<xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <xsd:element name="EffectiveUnitPrice" type="xsd:decimal"/>
  <xsd:complexType name="Report">
    <xsd:sequence>
      <xsd:element name="Currency" type="xsd:string" minOccurs="0"/>
      <xsd:element name="Status">
        <xsd:simpleType>
          <xsd:restriction base="xsd:string"/>
        </xsd:simpleType>
      </xsd:element>
    </xsd:sequence>
  </xsd:complexType>
</xsd:schema>
"""


def _prov() -> Provenance:
    return Provenance(module="outbound", file="out.xsd", source_hash="h",
                      parser="xsd", parser_version="0.1.0", parsed_at=datetime(2026, 7, 16))


def _parse(src):
    return list(XsdParser().parse(src, _prov()))


def _fact(items, subject):
    return next(f for f in items if isinstance(f, Fact) and f.subject == subject)


def test_type_and_version():
    assert XsdParser.type == "xsd" and XsdParser.version == "0.1.0"


def test_top_level_element_declares_name_and_type():
    f = _fact(_parse(SCHEMA), "EffectiveUnitPrice")
    assert f.kind == "element_decl"
    assert f.writes == ["EffectiveUnitPrice"] and f.reads == []
    assert f.attrs["type"] == "xsd:decimal"


def test_nested_element_captures_enclosing_type_and_options():
    f = _fact(_parse(SCHEMA), "Currency")
    assert f.attrs["type"] == "xsd:string"
    assert f.attrs["in_type"] == "Report"
    assert f.attrs["minOccurs"] == "0"


def test_inline_simple_type_restriction_base_is_the_type():
    f = _fact(_parse(SCHEMA), "Status")
    assert f.attrs["type"] == "xsd:string"   # from the restriction base


def test_all_declared_elements_found():
    subjects = {f.subject for f in _parse(SCHEMA) if isinstance(f, Fact)}
    assert subjects == {"EffectiveUnitPrice", "Currency", "Status"}


def test_provenance_line_and_symbol():
    f = _fact(_parse(SCHEMA), "EffectiveUnitPrice")
    assert f.provenance.symbol == "EffectiveUnitPrice"
    assert f.provenance.file == "out.xsd"
    assert f.provenance.line_start == 3


def test_malformed_xml_yields_error_issue():
    out = _parse("<xsd:schema><oops></xsd:schema>")
    assert len(out) == 1 and isinstance(out[0], ParseIssue)
    assert out[0].severity == Severity.ERROR


def test_dtd_is_refused():
    src = '<?xml version="1.0"?><!DOCTYPE s [<!ENTITY x "y">]><xsd:schema xmlns:xsd="http://www.w3.org/2001/XMLSchema"/>'
    out = _parse(src)
    assert len(out) == 1 and isinstance(out[0], ParseIssue) and "dtd" in out[0].message.lower()
