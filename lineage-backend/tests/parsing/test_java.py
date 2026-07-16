from datetime import datetime

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.parsers.java import JavaParser

PRICER = """
package com.acme.pricing;
class Pricer {
    double calc(Order order, double rate) {
        double base = order.getBasePrice();
        double discount = rate / 100.0;
        double price = base * (1 - discount);
        return price;
    }
}
"""


def _prov() -> Provenance:
    return Provenance(module="pricing", file="Pricer.java", source_hash="h",
                      parser="java", parser_version="0.1.0", parsed_at=datetime(2026, 7, 16))


def _parse(src):
    return list(JavaParser().parse(src, _prov()))


def _fact(items, subject):
    return next(f for f in items if isinstance(f, Fact) and f.subject == subject)


def test_type_and_version():
    assert JavaParser.type == "java" and JavaParser.version == "0.1.0"


def test_assignment_reads_writes_and_expr():
    price = _fact(_parse(PRICER), "price")
    assert price.kind == "assignment"
    assert price.writes == ["price"]
    assert sorted(price.reads) == ["base", "discount"]
    assert price.attrs["expr"] == "base * (1 - discount)"   # grouping preserved


def test_method_call_initializer_is_a_call_fact():
    base = _fact(_parse(PRICER), "base")
    assert base.kind == "call"
    assert base.reads == ["order"]                          # the qualifier is the read
    assert base.attrs["expr"] == "order.getBasePrice()"


def test_division_reads_only_the_variable():
    discount = _fact(_parse(PRICER), "discount")
    assert discount.reads == ["rate"]                       # 100.0 literal is not a read
    assert discount.attrs["expr"] == "rate / 100.0"


def test_symbol_is_class_dot_method():
    price = _fact(_parse(PRICER), "price")
    assert price.provenance.symbol == "Pricer.calc"
    assert price.provenance.line_start == 7


def test_reassignment_is_captured():
    src = """class C { void m(){ int x = 1; x = x + 2; } }"""
    facts = [f for f in _parse(src) if isinstance(f, Fact) and f.subject == "x"]
    assert len(facts) == 2                                  # the decl and the reassignment


def test_nested_class_symbol():
    src = """class Outer { class Inner { void go(){ int y = 5; } } }"""
    y = _fact(_parse(src), "y")
    assert y.provenance.symbol == "Outer.Inner.go"


def test_malformed_java_yields_error_issue_not_crash():
    out = _parse("class Broken { void m( {{{ }")
    assert len(out) == 1 and isinstance(out[0], ParseIssue)
    assert out[0].severity == Severity.ERROR
    assert out[0].parser == "java"


def test_empty_method_emits_nothing():
    assert _parse("class C { void m() {} }") == []
