from datetime import datetime

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.parsers.camel_yaml import CamelYamlParser

ROUTE = """
- route:
    id: pricingRoute
    from:
      uri: jms:queue:orders
      steps:
        - bean:
            ref: pricer
            method: calc
        - to:
            uri: xslt:transforms/out.xsl
        - to: file:/outbound/reports
- beans:
    - name: pricer
      type: com.acme.pricing.Pricer
"""


def _prov() -> Provenance:
    return Provenance(module="integration", file="routes.yaml", source_hash="h",
                      parser="camel-yaml", parser_version="0.1.0", parsed_at=datetime(2026, 7, 16))


def _parse(src: str):
    return list(CamelYamlParser().parse(src, _prov()))


def _kind(items, kind):
    return [f for f in items if isinstance(f, Fact) and f.kind == kind]


def test_type_and_version():
    assert CamelYamlParser.type == "camel-yaml"
    assert CamelYamlParser.version == "0.1.0"


def test_from_endpoint():
    f = _kind(_parse(ROUTE), "route_from")
    assert len(f) == 1 and f[0].subject == "jms:queue:orders"
    assert f[0].attrs["route"] == "pricingRoute"


def test_bean_step_ref_and_method():
    b = _kind(_parse(ROUTE), "route_bean")
    assert len(b) == 1 and b[0].subject == "pricer"
    assert b[0].attrs["method"] == "calc"


def test_xslt_stylesheet_captured():
    xslt = next(f for f in _kind(_parse(ROUTE), "route_to") if f.attrs.get("scheme") == "xslt")
    assert xslt.attrs["stylesheet"] == "transforms/out.xsl"


def test_bare_string_to_endpoint():
    tos = _kind(_parse(ROUTE), "route_to")
    assert any(f.subject == "file:/outbound/reports" for f in tos)


def test_beans_block_binds_id_to_class():
    d = _kind(_parse(ROUTE), "bean_def")
    assert len(d) == 1 and d[0].subject == "pricer"
    assert d[0].attrs["class"] == "com.acme.pricing.Pricer"


def test_steps_chain_end_to_end():
    facts = [f for f in _parse(ROUTE) if isinstance(f, Fact)]
    frm = next(f for f in facts if f.kind == "route_from")
    bean = next(f for f in facts if f.kind == "route_bean")
    xslt = next(f for f in facts if f.attrs.get("scheme") == "xslt")
    assert bean.reads == frm.writes
    assert xslt.reads == bean.writes


def test_provenance_has_a_line_number():
    frm = _kind(_parse(ROUTE), "route_from")[0]
    assert frm.provenance.file == "routes.yaml"
    assert isinstance(frm.provenance.line_start, int) and frm.provenance.line_start > 0


def test_flat_from_at_top_level():
    src = """
- from:
    uri: direct:start
    steps:
      - to: mock:end
"""
    f = _kind(_parse(src), "route_from")
    assert f and f[0].subject == "direct:start"


def test_routes_wrapper_form():
    src = """
routes:
  - route:
      from:
        uri: direct:a
        steps:
          - to: log:x
"""
    assert _kind(_parse(src), "route_from")[0].subject == "direct:a"


def test_malformed_yaml_yields_error_not_crash():
    out = _parse("- route:\n  from:\n    uri: [oops\n")
    assert len(out) == 1 and isinstance(out[0], ParseIssue)
    assert out[0].severity == Severity.ERROR


def test_bean_uri_string_form():
    src = """
- from:
    uri: direct:a
    steps:
      - to: bean:pricer?method=calc
"""
    b = _kind(_parse(src), "route_bean")
    assert b and b[0].subject == "pricer" and b[0].attrs["method"] == "calc"
