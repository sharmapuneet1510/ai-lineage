"""Apache Camel route parser — Spring/Blueprint XML DSL.

Camel routes are the integration spine: `from(endpoint) … bean … to(endpoint)`
declares where data enters, which beans process it, which transforms run, and
where it goes. This parser turns that topology into the shared Camel facts (see
_camel.py) that the tracer joins with the Java and XSLT facts.

Like every XML-family parser here it REFUSES documents that declare a DTD
(libxml2 substitutes entities in attribute values below resolve_entities;
see docs/PARSERS.md).
"""
from typing import Iterator

from lxml import etree

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.parsers import _camel
from app.parsing.registry import register

_PARSER = etree.XMLParser(resolve_entities=False, no_network=True, huge_tree=False)
_STEPS = {"from", "to", "tod", "bean", "process", "recipientlist", "wiretap"}


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

        for el in root.iter():
            if isinstance(el.tag, str) and _local(el.tag) == "bean" and el.get("class") and el.get("id"):
                yield _camel.make_bean_def(el.get("id"), el.get("class"), _at(base, el))

        for route in (e for e in root.iter() if isinstance(e.tag, str) and _local(e.tag) == "route"):
            rid = route.get("id") or "route"
            prev: str | None = None
            for step in route.iter():
                if step is route or not isinstance(step.tag, str):
                    continue
                ln = _local(step.tag)
                if ln not in _STEPS:
                    continue
                fact, prev = self._fact(ln, step, rid, prev, base)
                if fact is not None:
                    yield fact

    def _fact(self, ln, step, rid, prev, base):
        prov = _at(base, step)
        if ln == "from":
            return _camel.make_from(step.get("uri") or "", rid, prov), (step.get("uri") or "")
        if ln in ("to", "tod", "recipientlist", "wiretap"):
            return _camel.make_to(step.get("uri") or "", rid, prev, prov)
        if ln == "bean":
            ref = step.get("ref")
            if not ref:
                return None, prev
            return _camel.make_bean_ref(ref, step.get("method"), rid, prev, prov)
        if ln == "process":
            ref = step.get("ref")
            if not ref:
                return None, prev
            return _camel.make_process_ref(ref, rid, prev, prov)
        return None, prev


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


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
