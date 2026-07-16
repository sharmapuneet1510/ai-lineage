from datetime import datetime

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.parsers.camel_xml import CamelXmlParser

ROUTE = """<?xml version="1.0"?>
<camelContext xmlns="http://camel.apache.org/schema/spring">
  <route id="pricingRoute">
    <from uri="jms:queue:orders"/>
    <to uri="bean:pricer?method=calc"/>
    <to uri="xslt:transforms/out.xsl"/>
    <to uri="file:/outbound/reports"/>
  </route>
  <bean id="pricer" class="com.acme.pricing.Pricer"/>
</camelContext>
"""


def _prov() -> Provenance:
    return Provenance(module="integration", file="routes.xml", source_hash="h",
                      parser="camel-xml", parser_version="0.1.0", parsed_at=datetime(2026, 7, 16))


def _parse(src: str):
    return list(CamelXmlParser().parse(src, _prov()))


def _by_kind(items, kind):
    return [f for f in items if isinstance(f, Fact) and f.kind == kind]


def test_parser_type_and_version():
    assert CamelXmlParser.type == "camel-xml"
    assert CamelXmlParser.version == "0.1.0"


def test_from_endpoint_is_the_input():
    f = _by_kind(_parse(ROUTE), "route_from")
    assert len(f) == 1
    assert f[0].subject == "jms:queue:orders"
    assert f[0].attrs["scheme"] == "jms"
    assert f[0].attrs["route"] == "pricingRoute"


def test_bean_step_resolves_id_and_method():
    b = _by_kind(_parse(ROUTE), "route_bean")
    assert len(b) == 1
    assert b[0].subject == "pricer"
    assert b[0].attrs["bean_id"] == "pricer"
    assert b[0].attrs["method"] == "calc"


def test_xslt_endpoint_captures_the_stylesheet():
    tos = _by_kind(_parse(ROUTE), "route_to")
    xslt = next(f for f in tos if f.attrs.get("scheme") == "xslt")
    assert xslt.attrs["stylesheet"] == "transforms/out.xsl"


def test_output_endpoint_present():
    tos = _by_kind(_parse(ROUTE), "route_to")
    assert any(f.subject == "file:/outbound/reports" for f in tos)


def test_spring_bean_def_binds_id_to_class():
    d = _by_kind(_parse(ROUTE), "bean_def")
    assert len(d) == 1
    assert d[0].subject == "pricer"
    assert d[0].attrs["class"] == "com.acme.pricing.Pricer"


def test_steps_chain_so_lineage_flows_end_to_end():
    facts = [f for f in _parse(ROUTE) if isinstance(f, Fact)]
    # each route step reads what the previous step wrote
    frm = next(f for f in facts if f.kind == "route_from")
    bean = next(f for f in facts if f.kind == "route_bean")
    xslt = next(f for f in facts if f.attrs.get("scheme") == "xslt")
    assert bean.reads == frm.writes                 # bean reads the from-endpoint's output
    assert xslt.reads == bean.writes                # xslt reads the bean's output
    # the bean's output resolves to a class via the bean_def
    bean_def = next(f for f in facts if f.kind == "bean_def")
    assert bean_def.reads == [f"bean:{bean.subject}"]


def test_bean_ref_element_form_is_handled():
    src = """<?xml version="1.0"?>
    <routes xmlns="http://camel.apache.org/schema/spring">
      <route id="r"><from uri="direct:a"/><bean ref="pricer" method="calc"/></route>
    </routes>"""
    b = _by_kind(_parse(src), "route_bean")
    assert b and b[0].subject == "pricer" and b[0].attrs["method"] == "calc"


def test_provenance_carries_file_and_line():
    frm = _by_kind(_parse(ROUTE), "route_from")[0]
    assert frm.provenance.file == "routes.xml"
    assert frm.provenance.line_start == 4  # the <from> line


def test_malformed_xml_yields_error_issue_not_crash():
    out = _parse("<route><from uri='x'></route>")
    assert len(out) == 1 and isinstance(out[0], ParseIssue)
    assert out[0].severity == Severity.ERROR


def test_dtd_is_refused():
    src = '<?xml version="1.0"?><!DOCTYPE routes [<!ENTITY x "y">]><routes/>'
    out = _parse(src)
    assert len(out) == 1 and isinstance(out[0], ParseIssue)
    assert "dtd" in out[0].message.lower()


def test_route_with_no_id_still_parses():
    src = '<routes xmlns="http://camel.apache.org/schema/spring"><route><from uri="direct:x"/></route></routes>'
    f = _by_kind(_parse(src), "route_from")
    assert f and f[0].attrs["route"] == "route"
