"""XSD parser.

An XSD declares the shape of the output: which elements exist and their types.
This parser emits an element_decl fact per declared element — the terminal of a
lineage chain. The declared name joins to whatever produces it (an XSLT
template's output, an upstream field), so tracing a field shows both how it is
derived AND how the output schema declares it (its type).

    <xsd:element name="EffectiveUnitPrice" type="xsd:decimal"/>
      -> element_decl  subject=EffectiveUnitPrice  writes=[EffectiveUnitPrice]
                       attrs{type: xsd:decimal}

XML-family: refuses documents that declare a DTD; never raises.
"""
from typing import Iterator

from lxml import etree

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.registry import register

_XS = "http://www.w3.org/2001/XMLSchema"
_PARSER = etree.XMLParser(resolve_entities=False, no_network=True, huge_tree=False)


@register
class XsdParser:
    type = "xsd"
    version = "0.1.0"

    def parse(self, source: str, base: Provenance) -> Iterator[Fact | ParseIssue]:
        try:
            root = etree.fromstring(source.encode("utf-8"), _PARSER)
        except (etree.XMLSyntaxError, ValueError) as exc:
            yield ParseIssue(severity=Severity.ERROR, parser=self.type, file=base.file,
                             message=f"malformed XML: {exc}", provenance=base)
            return

        docinfo = root.getroottree().docinfo
        if docinfo.internalDTD is not None or docinfo.externalDTD is not None:
            yield ParseIssue(severity=Severity.ERROR, parser=self.type, file=base.file,
                             message="XML declares a DTD; not permitted. File was not parsed.",
                             provenance=base)
            return

        for el in (e for e in root.iter() if _is_xs(e, "element") and e.get("name")):
            name = el.get("name")
            attrs = {"type": el.get("type") or _inline_type(el)}
            for opt in ("minOccurs", "maxOccurs", "nillable"):
                if el.get(opt) is not None:
                    attrs[opt] = el.get(opt)
            parent = _enclosing_named_type(el)
            if parent:
                attrs["in_type"] = parent
            yield Fact(
                kind="element_decl", subject=name, reads=[], writes=[name],
                attrs=attrs,
                provenance=base.model_copy(update={"symbol": name, "line_start": el.sourceline}),
            )


def _is_xs(el, local: str) -> bool:
    return isinstance(el.tag, str) and el.tag == f"{{{_XS}}}{local}"


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _inline_type(el) -> str:
    for child in el:
        if _is_xs(child, "complexType"):
            return "complexType"
        if _is_xs(child, "simpleType"):
            for gc in child.iter():
                if _is_xs(gc, "restriction") and gc.get("base"):
                    return gc.get("base")
            return "simpleType"
    return "anyType"


def _enclosing_named_type(el) -> str | None:
    node = el.getparent()
    while node is not None:
        if _is_xs(node, "complexType") and node.get("name"):
            return node.get("name")
        node = node.getparent()
    return None
