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

# Hardened against entity-expansion attacks (billion laughs) and XXE.
#   resolve_entities=False -> entities referenced from element/tail TEXT are
#     left as unresolved etree.Entity nodes instead of being expanded.
#     IMPORTANT: this does NOT cover attribute values. libxml2 performs
#     attribute-value normalization below the resolve_entities layer, so an
#     entity used inside an attribute (e.g. id="&xxe;") is fully substituted
#     into the attribute string with no Entity node left anywhere in the
#     tree to detect. resolve_entities=False is therefore defence in depth
#     only, not a guarantee — the primary defence is refusing any document
#     that declares a DTD at all (see the docinfo check in parse()).
#   no_network=True        -> external entities/DTDs are never fetched
#     over the network even if resolution were somehow attempted.
#   huge_tree=False         -> keeps lxml's built-in depth/size guards
#     active (do not raise this to bypass them).
# Reused across calls: building an XMLParser per document is wasteful and
# this configuration is immutable and thread-safe to share.
_PARSER = etree.XMLParser(
    resolve_entities=False,
    no_network=True,
    huge_tree=False,
)


@register
class XmlParser:
    type = "xml"
    version = "0.1.0"

    def parse(
        self, source: str, base: Provenance
    ) -> Iterator[Fact | ParseIssue]:
        try:
            root = etree.fromstring(source.encode("utf-8"), _PARSER)
        except (etree.XMLSyntaxError, ValueError) as exc:
            yield ParseIssue(
                severity=Severity.ERROR,
                parser=self.type,
                file=base.file,
                message=f"malformed XML: {exc}",
                provenance=base,
            )
            return

        docinfo = root.getroottree().docinfo
        if docinfo.internalDTD is not None or docinfo.externalDTD is not None:
            # Primary defence, structural rather than enumerative: refuse
            # ANY document that declares a DTD, whether or not it declares
            # entities. This is deliberately broader than "no entities" —
            # scanning the parsed tree for leftover entity usage (see the
            # redundant check below) only catches entities referenced from
            # element/tail TEXT, where libxml2 leaves an etree.Entity node
            # behind. It does NOT catch entities used in ATTRIBUTE VALUES:
            # libxml2 substitutes those during attribute-value
            # normalization, a layer below resolve_entities, so the
            # resolved string lands directly in element.attrib with no
            # trace anywhere in the tree that an entity was ever involved.
            # A document like `<order id="&xxe;">` would otherwise sail
            # through as a normal "attribute" fact with value "PWNED" (or
            # the contents of a file read via a SYSTEM entity) — silently
            # wrong lineage, which is worse than a refusal. Legitimate
            # business data files have no need for <!DOCTYPE>/<!ENTITY>
            # declarations, so refusing the DTD outright closes the
            # element-text path and the attribute-value path at once,
            # structurally, instead of trying to enumerate every place an
            # entity can surface in the parsed tree.
            yield ParseIssue(
                severity=Severity.ERROR,
                parser=self.type,
                file=base.file,
                message=(
                    "XML document declares a DTD (<!DOCTYPE ...>); DTD and "
                    "entity declarations are not permitted because entities "
                    "can be substituted into attribute values with no trace "
                    "left in the parsed tree, bypassing entity-expansion "
                    "hardening. The file was not parsed."
                ),
                provenance=base,
            )
            return

        # Redundant, secondary check: with the DTD refusal above, no
        # document reaching this point can declare an <!ENTITY>, so this
        # should never fire. Kept only as defence in depth against a
        # future change to the DTD check above; it must not be relied on
        # as the primary defence since it only catches element/tail-text
        # entity usage, not attribute values (see comment above).
        entity_refs = [el.text for el in root.iter() if el.tag is etree.Entity]
        if entity_refs:
            yield ParseIssue(
                severity=Severity.ERROR,
                parser=self.type,
                file=base.file,
                message=(
                    "XML entity references are not expanded for security "
                    f"reasons: {', '.join(sorted(set(entity_refs)))}"
                ),
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
