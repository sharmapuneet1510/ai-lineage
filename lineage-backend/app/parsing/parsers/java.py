"""Java parser — field logic (slice 1).

Emits facts for value-producing statements inside methods: local-variable
declarations and assignments. Each fact records what is written, the identifiers
read, the reconstructed expression, and the enclosing `Class.method` symbol —
which is the seam a Camel `route_bean` (via a Spring `bean_def`) resolves onto,
so cross-language lineage reaches the real code.

Not yet covered (later slices): the RouteBuilder DSL (`from().bean().to()`),
`@Component`/`@Bean` bean-id discovery, conditions/branches, and multi-file type
resolution. This slice is the field-level logic the tracer bridges into.
"""
from typing import Iterator

import javalang

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.registry import register

_BINARY = "BinaryOperation"


@register
class JavaParser:
    type = "java"
    version = "0.1.0"

    def parse(self, source: str, base: Provenance) -> Iterator[Fact | ParseIssue]:
        try:
            tree = javalang.parse.parse(source)
        except (javalang.parser.JavaSyntaxError, javalang.tokenizer.LexerError) as exc:
            yield ParseIssue(severity=Severity.ERROR, parser=self.type, file=base.file,
                             message=f"Java syntax error: {exc}", provenance=base)
            return
        except Exception as exc:  # javalang is strict; never take the run down
            yield ParseIssue(severity=Severity.ERROR, parser=self.type, file=base.file,
                             message=f"could not parse Java: {type(exc).__name__}: {exc}",
                             provenance=base)
            return

        for type_decl in getattr(tree, "types", []) or []:
            yield from self._type(type_decl, "", base)

    def _type(self, decl, outer, base):
        if not isinstance(decl, javalang.tree.TypeDeclaration):
            return
        name = (outer + "." if outer else "") + decl.name
        for member in getattr(decl, "body", []) or []:
            if isinstance(member, javalang.tree.MethodDeclaration):
                yield from self._method(member, name, base)
            elif isinstance(member, javalang.tree.TypeDeclaration):
                yield from self._type(member, name, base)  # nested class

    def _method(self, method, class_name, base):
        symbol = f"{class_name}.{method.name}"
        for node in _walk(method):
            if isinstance(node, javalang.tree.LocalVariableDeclaration):
                for d in node.declarators or []:
                    if d.initializer is not None:
                        yield self._fact(d.name, d.initializer, symbol, node, base)
            elif isinstance(node, javalang.tree.Assignment):
                lhs = _target_name(node.expressionl)
                if lhs:
                    yield self._fact(lhs, node.value, symbol, node, base)

    def _fact(self, name, expr_node, symbol, stmt, base):
        reads = [r for r in _reads(expr_node) if r != name]
        kind = "call" if isinstance(expr_node, javalang.tree.MethodInvocation) else "assignment"
        return Fact(
            kind=kind, subject=name, reads=reads, writes=[name],
            attrs={"expr": _expr(expr_node)},
            provenance=base.model_copy(update={"symbol": symbol, "line_start": _line(stmt)}),
        )


# ---- expression helpers -------------------------------------------------

def _walk(node):
    yield node
    for child in getattr(node, "children", []) or []:
        for it in (child if isinstance(child, (list, tuple)) else [child]):
            if isinstance(it, javalang.ast.Node):
                yield from _walk(it)


def _reads(node) -> list[str]:
    out: list[str] = []
    for n in _walk(node):
        if isinstance(n, javalang.tree.MethodInvocation) and n.qualifier:
            _add(out, n.qualifier.split(".")[0])
        elif isinstance(n, javalang.tree.MemberReference):
            _add(out, n.qualifier.split(".")[0] if n.qualifier else n.member)
    return out


def _add(lst, v):
    if v and v not in lst:
        lst.append(v)


def _target_name(node) -> str | None:
    if isinstance(node, javalang.tree.MemberReference):
        return node.member
    return None


def _expr(n) -> str:
    if n is None:
        return ""
    t = type(n).__name__
    if t == "Literal":
        return str(n.value)
    if t == "MemberReference":
        return (n.qualifier + "." if n.qualifier else "") + (n.member or "")
    if t == "MethodInvocation":
        args = ", ".join(_expr(a) for a in (n.arguments or []))
        return f"{(n.qualifier + '.') if n.qualifier else ''}{n.member}({args})"
    if t == _BINARY:
        left, right = _expr(n.operandl), _expr(n.operandr)
        if type(n.operandl).__name__ == _BINARY:
            left = f"({left})"
        if type(n.operandr).__name__ == _BINARY:
            right = f"({right})"
        return f"{left} {n.operator} {right}"
    if t == "This":
        return "this"
    if t == "Cast":
        return _expr(n.expression)
    return t


def _line(node) -> int | None:
    pos = getattr(node, "position", None)
    return pos.line if pos else None
