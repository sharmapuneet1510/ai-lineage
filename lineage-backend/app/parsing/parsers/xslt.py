"""XSLT parser.

A stylesheet transforms input paths into output elements. This parser captures
that as value-mapping facts: an `<xsl:value-of select="…"/>` inside a literal
result element produces that output element from a resolved input path.

    <xsl:template match="/Order/Price">
      <EffectiveUnitPrice><xsl:value-of select="."/></EffectiveUnitPrice>
    </xsl:template>

  -> template_match  subject=EffectiveUnitPrice  reads=[/Order/Price]
                     writes=[EffectiveUnitPrice]  attrs{template, match, select}

The output name joins to the XSD element it declares; the input path joins to
whatever produced it (a Java serialization, or an upstream Camel step).

XML-family: refuses documents that declare a DTD; never raises (a malformed
stylesheet yields a ParseIssue).
"""
from typing import Iterator

from lxml import etree

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.registry import register

_XSL = "http://www.w3.org/1999/XSL/Transform"
_PARSER = etree.XMLParser(resolve_entities=False, no_network=True, huge_tree=False)


@register
class XsltParser:
    type = "xslt"
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

        for tmpl in (e for e in root.iter() if _is_xsl(e, "template")):
            match = tmpl.get("match")
            name = tmpl.get("name")
            for vo in (e for e in tmpl.iter() if _is_xsl(e, "value-of")):
                out = _output_element(vo, tmpl)
                if out is None:
                    continue
                select = vo.get("select")
                read = _resolve(match, select)
                yield Fact(
                    kind="template_match", subject=out,
                    reads=[read] if read else [], writes=[out],
                    attrs={"template": name, "match": match, "select": select},
                    provenance=base.model_copy(update={
                        "symbol": name, "xpath": match, "line_start": vo.sourceline,
                    }),
                )


def _is_xsl(el, local: str) -> bool:
    return isinstance(el.tag, str) and el.tag == f"{{{_XSL}}}{local}"


def _local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1]


def _output_element(vo, tmpl) -> str | None:
    """The literal result element (or xsl:element) the value-of writes into."""
    node = vo.getparent()
    while node is not None and node is not tmpl:
        if isinstance(node.tag, str):
            if node.tag.startswith(f"{{{_XSL}}}"):
                if _local(node.tag) == "element" and node.get("name"):
                    return node.get("name")   # <xsl:element name="X">
            else:
                return _local(node.tag)        # a literal result element
        node = node.getparent()
    return None


def _resolve(match: str | None, select: str | None) -> str | None:
    """Resolve a value-of select against the template match to an input path."""
    if not select:
        return match
    if select.startswith("/"):
        return select
    if select == ".":
        return match
    if not match:
        return select
    return f"{match.rstrip('/')}/{select}"
