"""Java parser.

Emits facts for the three things that matter to cross-language lineage:

1. Field logic — local-variable declarations and assignments inside methods
   become assignment/call facts (reads, writes, reconstructed expression,
   `Class.method` symbol). This is what a Camel bean resolves onto.
2. Spring bean ids — a class carrying a stereotype annotation
   (`@Component`/`@Service`/…), or a `@Bean` factory method, becomes a bean_def
   binding an id to a class, so `bean:<id>` route steps resolve to real code
   even when the bean is annotation-defined rather than declared in XML.
3. RouteBuilder DSL — `from(...).bean(...).to(...)` chains in a RouteBuilder
   subclass become the same route facts the XML/YAML Camel parsers emit.

Never raises: a Java syntax error becomes a ParseIssue. Not yet: conditions/
branches, cross-file type resolution.
"""
from typing import Iterator

import javalang

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.parsers import _camel
from app.parsing.registry import register

_BINARY = "BinaryOperation"
_STEREOTYPES = {"Component", "Service", "Repository", "Controller", "Named", "ManagedBean"}
_ROUTE_BASES = {"RouteBuilder", "EndpointRouteBuilder", "AdviceWithRouteBuilder"}


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

        package = tree.package.name if tree.package else ""
        for type_decl in getattr(tree, "types", []) or []:
            yield from self._type(type_decl, "", package, base)

    def _type(self, decl, outer, package, base):
        if not isinstance(decl, javalang.tree.TypeDeclaration):
            return
        name = (outer + "." if outer else "") + decl.name
        fqn = (package + "." if package else "") + name

        stereotype = _stereotype_bean(decl, fqn, base)
        if stereotype is not None:
            yield stereotype

        if _extends_route(decl):
            yield from self._routes(decl, decl.name, base)

        for member in getattr(decl, "body", []) or []:
            if isinstance(member, javalang.tree.MethodDeclaration):
                bean_method = _bean_method(member, base)
                if bean_method is not None:
                    yield bean_method
                yield from self._method(member, name, base)
            elif isinstance(member, javalang.tree.TypeDeclaration):
                yield from self._type(member, name, package, base)

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
        return Fact(kind=kind, subject=name, reads=reads, writes=[name],
                    attrs={"expr": _expr(expr_node)},
                    provenance=base.model_copy(update={"symbol": symbol, "line_start": _line(stmt)}))

    def _routes(self, decl, class_name, base):
        for node in _walk(decl):
            if (isinstance(node, javalang.tree.MethodInvocation)
                    and node.member == "from" and not node.qualifier):
                yield from self._from_chain(node, class_name, base)

    def _from_chain(self, from_mi, class_name, base):
        selectors = from_mi.selectors or []
        rid = class_name
        for sel in selectors:
            if isinstance(sel, javalang.tree.MethodInvocation) and sel.member == "routeId" and sel.arguments:
                rid = _str(sel.arguments[0])
        uri = _str(from_mi.arguments[0]) if from_mi.arguments else ""
        prev = None
        if uri:
            yield _camel.make_from(uri, rid, _prov(base, from_mi))
            prev = uri
        for sel in selectors:
            if not isinstance(sel, javalang.tree.MethodInvocation):
                continue
            args = [_str(a) for a in (sel.arguments or [])]
            prov = _prov(base, from_mi)
            if sel.member in ("to", "toD", "recipientList", "wireTap") and args:
                fact, prev = _camel.make_to(args[0], rid, prev, prov)
                yield fact
            elif sel.member == "bean" and args:
                method = args[1] if len(args) > 1 else None
                fact, prev = _camel.make_bean_ref(args[0], method, rid, prev, prov)
                yield fact
            elif sel.member == "process" and args:
                fact, prev = _camel.make_process_ref(args[0], rid, prev, prov)
                yield fact


# ---- Spring bean discovery ---------------------------------------------

def _stereotype_bean(decl, fqn, base):
    for ann in getattr(decl, "annotations", []) or []:
        if ann.name in _STEREOTYPES:
            bean_id = _ann_value(ann) or _decapitalize(decl.name)
            return _camel.make_bean_def(bean_id, fqn, _prov(base, decl))
    return None


def _bean_method(method, base):
    for ann in getattr(method, "annotations", []) or []:
        if ann.name == "Bean":
            bean_id = _ann_value(ann) or method.name
            cls = _type_name(method.return_type) or bean_id
            return _camel.make_bean_def(bean_id, cls, _prov(base, method))
    return None


def _extends_route(decl):
    ext = getattr(decl, "extends", None)
    return bool(ext) and getattr(ext, "name", None) in _ROUTE_BASES


def _decapitalize(name: str) -> str:
    if len(name) > 1 and name[0].isupper() and name[1].isupper():
        return name  # Spring leaves acronyms (URLReader) as-is
    return name[:1].lower() + name[1:]


def _ann_value(ann):
    el = getattr(ann, "element", None)
    if el is None:
        return None
    if type(el).__name__ == "Literal":
        v = str(el.value)
        return v[1:-1] if v[:1] == '"' else v
    return None


def _type_name(t):
    return getattr(t, "name", None)


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


def _target_name(node):
    if isinstance(node, javalang.tree.MemberReference):
        return node.member
    return None


def _str(node) -> str:
    v = _expr(node)
    if len(v) >= 2 and v[0] == '"' and v[-1] == '"':
        return v[1:-1]
    return v


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


def _line(node):
    pos = getattr(node, "position", None)
    return pos.line if pos else None


def _prov(base, node):
    return base.model_copy(update={"line_start": _line(node)})
