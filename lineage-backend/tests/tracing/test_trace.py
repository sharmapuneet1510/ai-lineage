import json

from app.tracing.trace import (
    bean_class_map, class_fields, discover_targets, flatten, trace,
)


def _fact(kind, subject, reads=None, writes=None, symbol=None, parser="java", **attrs):
    return {"kind": kind, "subject": subject, "reads": reads or [], "writes": writes or [subject],
            "attrs": attrs, "provenance": {"symbol": symbol, "parser": parser, "file": f"{parser}.src", "line_start": 1}}


# a full Camel → bean → Java → XSLT → sink graph
FACTS = [
    {"kind": "route_from", "subject": "jms:queue:orders", "reads": [], "writes": ["jms:queue:orders"],
     "attrs": {"route": "r"}, "provenance": {"parser": "camel-xml", "file": "routes.xml", "line_start": 3}},
    {"kind": "route_bean", "subject": "pricer", "reads": ["jms:queue:orders"], "writes": ["bean:pricer"],
     "attrs": {"bean_id": "pricer", "method": "calc"}, "provenance": {"parser": "camel-xml", "file": "routes.xml", "line_start": 4}},
    {"kind": "route_to", "subject": "xslt:out.xsl", "reads": ["bean:pricer"], "writes": ["xslt:out.xsl"],
     "attrs": {"scheme": "xslt", "stylesheet": "out.xsl"}, "provenance": {"parser": "camel-xml", "file": "routes.xml", "line_start": 5}},
    {"kind": "route_to", "subject": "file:/out", "reads": ["xslt:out.xsl"], "writes": ["file:/out"],
     "attrs": {"scheme": "file"}, "provenance": {"parser": "camel-xml", "file": "routes.xml", "line_start": 6}},
    {"kind": "bean_def", "subject": "pricer", "reads": ["bean:pricer"], "writes": ["class:com.acme.Pricer"],
     "attrs": {"class": "com.acme.Pricer"}, "provenance": {"parser": "camel-xml", "file": "routes.xml", "line_start": 9}},
    # Java field logic inside the Pricer class
    _fact("assignment", "price", reads=["base"], writes=["price"], symbol="Pricer.calc", expr="base*(1-d)"),
    _fact("call", "base", reads=["order"], writes=["base"], symbol="Pricer.calc", expr="order.getBasePrice()"),
]


def test_bean_class_map():
    assert bean_class_map(FACTS)["pricer"] == "com.acme.Pricer"


def test_class_fields_finds_the_classes_field_logic():
    assert set(class_fields(FACTS, "com.acme.Pricer")) == {"price", "base"}


def test_discover_targets_includes_the_output_sink_only():
    targets = discover_targets(FACTS)
    assert "file:/out" in targets           # the terminal output endpoint
    assert "base" not in targets            # base is read by price -> not a sink
    assert not any(t.startswith(("bean:", "class:")) for t in targets)  # no synthetic names


def test_trace_walks_backward_to_the_input_endpoint():
    tree = trace("file:/out", FACTS)
    names = {name for _, hop in flatten(tree) if (name := hop.get("name"))}
    # the whole cross-layer chain is present (the bean's routing name is bean:pricer)
    assert {"file:/out", "xslt:out.xsl", "bean:pricer", "jms:queue:orders"} <= names


def test_trace_bridges_bean_to_the_java_field_logic():
    tree = trace("file:/out", FACTS)
    rows = flatten(tree)
    # the route_bean hop resolves to the class...
    bean_hop = next(hop for _, hop in rows if hop.get("resolved_class"))
    assert bean_hop["name"] == "bean:pricer"
    assert bean_hop["resolved_class"] == "com.acme.Pricer"
    # ...and the class's Java fields appear upstream of it
    names = {hop.get("name") for _, hop in rows}
    assert "price" in names and "base" in names


def test_trace_marks_a_gap_when_nothing_produces_a_read():
    facts = [
        {"kind": "assignment", "subject": "total", "reads": ["price", "rounding"], "writes": ["total"],
         "attrs": {}, "provenance": {"parser": "java", "file": "L.java", "line_start": 1}},
        _fact("assignment", "price", writes=["price"], symbol="P.calc"),
    ]
    tree = trace("total", facts)
    gap_names = {hop["name"] for _, hop in flatten(tree) if hop.get("gap")}
    assert "rounding" in gap_names   # read but never produced -> honest gap


def test_trace_survives_a_cycle():
    facts = [
        {"kind": "x", "subject": "a", "reads": ["b"], "writes": ["a"], "attrs": {}, "provenance": {"parser": "j", "file": "f", "line_start": 1}},
        {"kind": "x", "subject": "b", "reads": ["a"], "writes": ["b"], "attrs": {}, "provenance": {"parser": "j", "file": "f", "line_start": 2}},
    ]
    tree = trace("a", facts)  # must not recurse forever
    assert tree["name"] == "a"


def test_run_trace_writes_lineage_json(tmp_path):
    from scripts.run_trace import main
    (tmp_path / "evidence.idx").write_text(json.dumps({"tokens": {}, "facts": FACTS}))
    assert main(["--out", str(tmp_path)]) == 0
    lineage = json.loads((tmp_path / "lineage.json").read_text())
    assert "file:/out" in lineage
    assert lineage["file:/out"]["produced_by"]


def test_subtree_is_memoized_and_shared():
    # base is reachable via the bean bridge and via price; it must be expanded once
    tree = trace("file:/out", FACTS)
    rows = [hop for _, hop in flatten(tree)]
    base_hops = [h for h in rows if h.get("name") == "base" and not h.get("gap")]
    # every 'base' node in the tree is the SAME object (shared, not recomputed)
    ids = set()
    def collect(node):
        for e in node.get("produced_by", []):
            for up in e.get("upstream", []):
                if up.get("name") == "base":
                    ids.add(id(up))
                collect(up)
    collect(tree)
    assert len(ids) == 1


def test_crosses_marks_the_language_boundary():
    tree = trace("file:/out", FACTS)
    # the route_bean hop reads the Java field logic -> crosses into java
    bean = next(e for e in _all_entries(tree) if e.get("resolved_class"))
    assert "java" in bean.get("crosses", [])


def _all_entries(node):
    for e in node.get("produced_by", []):
        yield e
        for up in e.get("upstream", []):
            yield from _all_entries(up)
