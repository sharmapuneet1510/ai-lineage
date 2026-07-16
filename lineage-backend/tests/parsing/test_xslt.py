from datetime import datetime

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.parsers.xslt import XsltParser

STYLE = """<?xml version="1.0"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
  <xsl:template name="emitPrice" match="/Order/Price">
    <EffectiveUnitPrice><xsl:value-of select="."/></EffectiveUnitPrice>
  </xsl:template>
  <xsl:template match="/Order">
    <Report>
      <Currency><xsl:value-of select="Price/@currency"/></Currency>
    </Report>
  </xsl:template>
</xsl:stylesheet>
"""


def _prov() -> Provenance:
    return Provenance(module="transforms", file="out.xsl", source_hash="h",
                      parser="xslt", parser_version="0.1.0", parsed_at=datetime(2026, 7, 16))


def _parse(src):
    return list(XsltParser().parse(src, _prov()))


def _fact(items, subject):
    return next(f for f in items if isinstance(f, Fact) and f.subject == subject)


def test_type_and_version():
    assert XsltParser.type == "xslt" and XsltParser.version == "0.1.0"


def test_value_of_dot_reads_the_template_match():
    f = _fact(_parse(STYLE), "EffectiveUnitPrice")
    assert f.kind == "template_match"
    assert f.writes == ["EffectiveUnitPrice"]
    assert f.reads == ["/Order/Price"]           # select="." resolves to the match
    assert f.attrs["template"] == "emitPrice"


def test_relative_select_is_resolved_against_the_match():
    f = _fact(_parse(STYLE), "Currency")
    assert f.reads == ["/Order/Price/@currency"]  # match /Order + select Price/@currency


def test_output_element_is_the_literal_result_element():
    subjects = {f.subject for f in _parse(STYLE) if isinstance(f, Fact)}
    assert subjects == {"EffectiveUnitPrice", "Currency"}


def test_provenance_carries_match_as_xpath_and_line():
    f = _fact(_parse(STYLE), "EffectiveUnitPrice")
    assert f.provenance.xpath == "/Order/Price"
    assert f.provenance.file == "out.xsl"
    assert f.provenance.line_start == 4


def test_absolute_select_kept_as_is():
    src = """<?xml version="1.0"?>
    <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
      <xsl:template match="/A"><Out><xsl:value-of select="/Root/Val"/></Out></xsl:template>
    </xsl:stylesheet>"""
    assert _fact(_parse(src), "Out").reads == ["/Root/Val"]


def test_xsl_element_name_is_the_output():
    src = """<?xml version="1.0"?>
    <xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
      <xsl:template match="/A"><xsl:element name="Dyn"><xsl:value-of select="."/></xsl:element></xsl:template>
    </xsl:stylesheet>"""
    assert _fact(_parse(src), "Dyn").reads == ["/A"]


def test_malformed_xml_yields_error_issue():
    out = _parse("<xsl:stylesheet><oops></xsl:stylesheet>")
    assert len(out) == 1 and isinstance(out[0], ParseIssue)
    assert out[0].severity == Severity.ERROR


def test_dtd_is_refused():
    src = '<?xml version="1.0"?><!DOCTYPE s [<!ENTITY x "y">]><xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform"/>'
    out = _parse(src)
    assert len(out) == 1 and isinstance(out[0], ParseIssue) and "dtd" in out[0].message.lower()
