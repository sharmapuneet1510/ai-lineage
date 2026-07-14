"""XML reference parser.

Deliberately small. Its job is to prove the Parser contract end to end — the
fact model, provenance filling, and the never-raise-always-yield-an-issue error
contract — so that the XSD, XSLT, Java, and document parsers have a pattern to
copy.

Fact kinds emitted:
  element    subject=<localname>  attrs={path, text}   provenance.xpath, line_start
  attribute  subject=<name>       attrs={path, value}  provenance.xpath, line_start
"""
from typing import Iterator

from lxml import etree

from app.parsing.facts import Fact, ParseIssue, Provenance, Severity
from app.parsing.registry import register


@register
class XmlParser:
    type = "xml"
    version = "0.1.0"

    def parse(
        self, source: str, base: Provenance
    ) -> Iterator[Fact | ParseIssue]:
        try:
            root = etree.fromstring(source.encode("utf-8"))
        except etree.XMLSyntaxError as exc:
            yield ParseIssue(
                severity=Severity.ERROR,
                parser=self.type,
                file=base.file,
                message=f"malformed XML: {exc}",
                provenance=base,
            )
            return

        tree = root.getroottree()
        for element in root.iter():
            if not isinstance(element.tag, str):
                continue  # comments and processing instructions
            path = _clean_path(tree.getpath(element))
            yield Fact(
                kind="element",
                subject=_localname(element.tag),
                attrs={"path": path, "text": _text_of(element)},
                provenance=_at(base, path, element.sourceline),
            )
            for name, value in element.attrib.items():
                attr_path = f"{path}/@{_localname(name)}"
                yield Fact(
                    kind="attribute",
                    subject=_localname(name),
                    attrs={"path": attr_path, "value": value},
                    provenance=_at(base, attr_path, element.sourceline),
                )


def _at(base: Provenance, xpath: str, line: int | None) -> Provenance:
    return base.model_copy(update={"xpath": xpath, "line_start": line})


def _localname(tag: str) -> str:
    """Strip the {namespace} prefix lxml puts on qualified names."""
    return tag.rsplit("}", 1)[-1]


def _clean_path(path: str) -> str:
    """lxml emits /o:order[1]/o:price[1]; we want /order/price."""
    parts = []
    for segment in path.split("/"):
        if not segment:
            continue
        segment = segment.split("[", 1)[0]
        parts.append(segment.rsplit(":", 1)[-1])
    return "/" + "/".join(parts)


def _text_of(element: etree._Element) -> str | None:
    if element.text is None:
        return None
    text = element.text.strip()
    return text or None
