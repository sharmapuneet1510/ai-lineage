"""Apache Camel route parser — Spring/Blueprint XML DSL.

Camel routes are the integration spine: `from(endpoint) … bean … to(endpoint)`
literally declares where data enters, which beans process it, which transforms
run, and where it goes. This parser turns that topology into facts that the
tracer joins with the Java and XSLT facts.

Fact kinds emitted:
  route_from  subject=<uri>   attrs{route, scheme, uri}                 the input endpoint
  route_to    subject=<uri>   attrs{route, scheme, uri, stylesheet?}    a downstream step / endpoint
  route_bean  subject=<id>    attrs{route, bean_id, method?, uri?}      a call into a Spring bean
  bean_def    subject=<id>    attrs{class}                              a Spring bean id -> class binding

Steps within a route chain via reads/writes so lineage flows end to end; a
`route_bean` writes `bean:<id>` and a `bean_def` reads `bean:<id>` and writes the
class — that is the seam the Java field logic joins onto.

Like every XML-family parser here it REFUSES documents that declare a DTD
(libxml2 substitutes entities in attribute values below resolve_entities;
see docs/PARSERS.md).
"""
from typing import Iterator
from urllib.parse import parse_qs, urlsplit

from lxml import etree

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.registry import register

_PARSER = etree.XMLParser(resolve_entities=False, no_network=True, huge_tree=False)

_ROUTE_STEPS = {"from", "to", "tod", "bean", "process", "recipientlist", "wiretap"}


@register
class CamelXmlParser:
    type = "camel-xml"
    version = "0.1.0"

    def parse(self, source: str, base: Provenance) -> Iterator[Fact | ParseIssue]:
        try:
            root = etree.fromstring(source.encode("utf-8"), _PARSER)
        except (etree.XMLSyntaxError, ValueError) as exc:
            yield ParseIssue(severity=Severity.ERROR, parser=self.type,
                             file=base.file, message=f"malformed XML: {exc}", provenance=base)
            return

        docinfo = root.getroottree().docinfo
        if docinfo.internalDTD is not None or docinfo.externalDTD is not None:
            yield ParseIssue(severity=Severity.ERROR, parser=self.type, file=base.file,
                             message="XML declares a DTD; not permitted. File was not parsed.",
                             provenance=base)
            return

        # Spring bean id -> class bindings, wherever they appear.
        for el in root.iter():
            if not isinstance(el.tag, str):
                continue
            if _local(el.tag) == "bean" and el.get("class") and el.get("id"):
                yield Fact(
                    kind="bean_def", subject=el.get("id"),
                    reads=[f"bean:{el.get('id')}"], writes=[f"class:{el.get('class')}"],
                    attrs={"class": el.get("class")},
                    provenance=_at(base, el),
                )

        # Routes: walk each route's steps in document order, chaining reads->writes.
        for route in (e for e in root.iter() if isinstance(e.tag, str) and _local(e.tag) == "route"):
            rid = route.get("id") or "route"
            prev: str | None = None
            for step in route.iter():
                if step is route or not isinstance(step.tag, str):
                    continue
                ln = _local(step.tag)
                if ln not in _ROUTE_STEPS:
                    continue
                fact, prev = self._step_fact(ln, step, rid, prev, base)
                if fact is not None:
                    yield fact

    def _step_fact(self, ln, step, rid, prev, base):
        reads = [prev] if prev else []
        if ln == "from":
            uri = step.get("uri") or ""
            return Fact(kind="route_from", subject=uri, reads=[], writes=[uri],
                        attrs={"route": rid, "scheme": _scheme(uri), "uri": uri},
                        provenance=_at(base, step)), uri
        if ln in ("to", "tod", "recipientlist", "wiretap"):
            uri = step.get("uri") or ""
            if _scheme(uri) == "bean":
                bean_id, method = _bean_uri(uri)
                w = f"bean:{bean_id}"
                return Fact(kind="route_bean", subject=bean_id, reads=reads, writes=[w],
                            attrs={"route": rid, "bean_id": bean_id, "method": method, "uri": uri},
                            provenance=_at(base, step)), w
            attrs = {"route": rid, "scheme": _scheme(uri), "uri": uri}
            if _scheme(uri) == "xslt":
                attrs["stylesheet"] = uri.split(":", 1)[1].split("?", 1)[0]
            return Fact(kind="route_to", subject=uri, reads=reads, writes=[uri],
                        attrs=attrs, provenance=_at(base, step)), uri
        if ln == "bean":
            ref = step.get("ref")
            if not ref:
                return None, prev
            w = f"bean:{ref}"
            return Fact(kind="route_bean", subject=ref, reads=reads, writes=[w],
                        attrs={"route": rid, "bean_id": ref, "method": step.get("method")},
                        provenance=_at(base, step)), w
        if ln == "process":
            ref = step.get("ref")
            if not ref:
                return None, prev
            w = f"process:{ref}"
            return Fact(kind="route_process", subject=ref, reads=reads, writes=[w],
                        attrs={"route": rid, "ref": ref}, provenance=_at(base, step)), w
        return None, prev


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _scheme(uri: str) -> str:
    return uri.split(":", 1)[0] if ":" in uri else uri


def _bean_uri(uri: str) -> tuple[str, str | None]:
    """bean:pricer?method=calc -> ('pricer', 'calc');  bean:pricer -> ('pricer', None)."""
    rest = uri.split(":", 1)[1] if ":" in uri else uri
    parts = urlsplit("//" + rest)  # borrow query parsing
    bean_id = (parts.netloc + parts.path).split("?", 1)[0] or rest.split("?", 1)[0]
    method = None
    if parts.query:
        method = (parse_qs(parts.query).get("method") or [None])[0]
    return bean_id, method


def _at(base: Provenance, el: etree._Element) -> Provenance:
    return base.model_copy(update={
        "line_start": el.sourceline,
        "xpath": _clean_path(el.getroottree().getpath(el)),
    })


def _clean_path(path: str) -> str:
    parts = []
    for seg in path.split("/"):
        if not seg:
            continue
        parts.append(seg.split("[", 1)[0].rsplit(":", 1)[-1])
    return "/" + "/".join(parts)
