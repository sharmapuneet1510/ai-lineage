"""Apache Camel route parser — YAML DSL.

Emits the same facts as the XML DSL parser (see _camel.py). A line-tracking YAML
loader records the source line of each mapping so facts carry provenance.

Handles the common shapes:
    - route:
        id: pricingRoute
        from:
          uri: jms:queue:orders
          steps:
            - to: { uri: "xslt:out.xsl" }   # or a bare string: to: "xslt:out.xsl"
            - bean: { ref: pricer, method: calc }
    - beans:
        - name: pricer
          type: com.acme.pricing.Pricer     # or class:
"""
from typing import Iterator

import yaml

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.parsers import _camel
from app.parsing.registry import register

_LINE = "__line__"


class _LineLoader(yaml.SafeLoader):
    pass


def _mapping_with_line(loader, node, deep=False):
    mapping = yaml.SafeLoader.construct_mapping(loader, node, deep=deep)
    mapping[_LINE] = node.start_mark.line + 1
    return mapping


_LineLoader.add_constructor(
    yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, _mapping_with_line
)


@register
class CamelYamlParser:
    type = "camel-yaml"
    version = "0.1.0"

    def parse(self, source: str, base: Provenance) -> Iterator[Fact | ParseIssue]:
        try:
            doc = yaml.load(source, Loader=_LineLoader)
        except yaml.YAMLError as exc:
            yield ParseIssue(severity=Severity.ERROR, parser=self.type,
                             file=base.file, message=f"malformed YAML: {exc}", provenance=base)
            return

        for node in _top_items(doc):
            if not isinstance(node, dict):
                continue
            if "beans" in node:
                yield from self._beans(node["beans"], base)
            elif "route" in node and isinstance(node["route"], dict):
                yield from self._route(node["route"], base)
            elif "from" in node:
                yield from self._route(node, base)

    def _beans(self, beans, base):
        if not isinstance(beans, list):
            return
        for b in beans:
            if not isinstance(b, dict):
                continue
            bean_id = b.get("name") or b.get("id")
            cls = b.get("type") or b.get("class")
            if bean_id and cls:
                yield _camel.make_bean_def(bean_id, cls, _at(base, b))

    def _route(self, route, base):
        rid = route.get("id") or "route"
        frm = route.get("from")
        prev: str | None = None

        if isinstance(frm, dict):
            uri = frm.get("uri") or ""
            steps = frm.get("steps")
        elif isinstance(frm, str):
            uri, steps = frm, route.get("steps")
        else:
            uri, steps = "", route.get("steps")

        if uri:
            yield _camel.make_from(uri, rid, _at(base, route if isinstance(frm, str) else frm))
            prev = uri

        for step in steps or []:
            if not isinstance(step, dict):
                continue
            fact, prev = self._step(step, rid, prev, base)
            if fact is not None:
                yield fact

    def _step(self, step, rid, prev, base):
        prov = _at(base, step)
        op = next((k for k in step if k != _LINE), None)
        val = step.get(op)
        if op in ("to", "toD", "recipientList", "wireTap"):
            uri = val if isinstance(val, str) else (val.get("uri") if isinstance(val, dict) else "")
            return _camel.make_to(uri or "", rid, prev, prov)
        if op == "bean":
            if isinstance(val, dict):
                ref = val.get("ref") or val.get("beanName")
                if ref:
                    return _camel.make_bean_ref(ref, val.get("method"), rid, prev, prov)
        if op == "process":
            if isinstance(val, dict) and val.get("ref"):
                return _camel.make_process_ref(val["ref"], rid, prev, prov)
        return None, prev


def _top_items(doc):
    if isinstance(doc, list):
        return doc
    if isinstance(doc, dict):
        # {routes: [...]} or a single route/beans mapping
        if isinstance(doc.get("routes"), list):
            return doc["routes"]
        return [doc]
    return []


def _at(base: Provenance, node) -> Provenance:
    line = node.get(_LINE) if isinstance(node, dict) else None
    return base.model_copy(update={"line_start": line})
