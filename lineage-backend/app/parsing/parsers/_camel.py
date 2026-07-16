"""Shared Camel fact vocabulary, used by every Camel DSL parser (XML, YAML, and
later the Java DSL) so all three emit identical facts. The DSL parsers only
differ in how they read routes off disk; the fact shape is defined once here.
"""
from urllib.parse import parse_qs, urlsplit

from app.parsing.facts import Fact, Provenance


def endpoint_scheme(uri: str) -> str:
    return uri.split(":", 1)[0] if ":" in uri else uri


def bean_uri(uri: str) -> tuple[str, str | None]:
    """bean:pricer?method=calc -> ('pricer', 'calc');  bean:pricer -> ('pricer', None)."""
    rest = uri.split(":", 1)[1] if ":" in uri else uri
    parts = urlsplit("//" + rest)
    bean_id = (parts.netloc + parts.path).split("?", 1)[0] or rest.split("?", 1)[0]
    method = None
    if parts.query:
        method = (parse_qs(parts.query).get("method") or [None])[0]
    return bean_id, method


def make_from(uri: str, route: str, prov: Provenance) -> Fact:
    return Fact(kind="route_from", subject=uri, reads=[], writes=[uri],
                attrs={"route": route, "scheme": endpoint_scheme(uri), "uri": uri},
                provenance=prov)


def make_to(uri: str, route: str, prev: str | None, prov: Provenance) -> tuple[Fact, str]:
    """A `to` endpoint. `bean:` URIs become route_bean facts; `xslt:` capture the
    stylesheet. Returns the fact and the new chain head."""
    reads = [prev] if prev else []
    scheme = endpoint_scheme(uri)
    if scheme == "bean":
        bean_id, method = bean_uri(uri)
        w = f"bean:{bean_id}"
        return Fact(kind="route_bean", subject=bean_id, reads=reads, writes=[w],
                    attrs={"route": route, "bean_id": bean_id, "method": method, "uri": uri},
                    provenance=prov), w
    attrs = {"route": route, "scheme": scheme, "uri": uri}
    if scheme == "xslt":
        attrs["stylesheet"] = uri.split(":", 1)[1].split("?", 1)[0]
    return Fact(kind="route_to", subject=uri, reads=reads, writes=[uri],
                attrs=attrs, provenance=prov), uri


def make_bean_ref(ref: str, method: str | None, route: str, prev: str | None,
                  prov: Provenance) -> tuple[Fact, str]:
    reads = [prev] if prev else []
    w = f"bean:{ref}"
    return Fact(kind="route_bean", subject=ref, reads=reads, writes=[w],
                attrs={"route": route, "bean_id": ref, "method": method},
                provenance=prov), w


def make_process_ref(ref: str, route: str, prev: str | None, prov: Provenance) -> tuple[Fact, str]:
    reads = [prev] if prev else []
    w = f"process:{ref}"
    return Fact(kind="route_process", subject=ref, reads=reads, writes=[w],
                attrs={"route": route, "ref": ref}, provenance=prov), w


def make_bean_def(bean_id: str, cls: str, prov: Provenance) -> Fact:
    """A Spring bean id -> class binding: the seam route_bean joins onto."""
    return Fact(kind="bean_def", subject=bean_id,
                reads=[f"bean:{bean_id}"], writes=[f"class:{cls}"],
                attrs={"class": cls}, provenance=prov)
