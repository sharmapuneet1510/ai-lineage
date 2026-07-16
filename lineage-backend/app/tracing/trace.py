"""Tracing stage: parsed facts -> field lineage.

Facts are atomic ("line 41 writes price from base, discount"). Tracing walks them
into a chain — the derivation of a target, backwards to its sources — resolving
the joins no single parser could make:

  * dataflow / cross-language: fact A feeds fact B when A.writes ∩ B.reads ≠ ∅
    (this is how Java → XSLT and Camel → XSLT connect, on the shared name).
  * bean → class → field logic: a Camel `route_bean` names a Spring bean id; a
    `bean_def` resolves it to a class; the class's own facts are its field logic.
    Tracing bridges those so a route step reaches the code it calls.

The tracer is deterministic and never invents: if nothing produces a name, the
chain stops there and the node is marked a gap.
"""
from typing import Any


def build_producers(facts: list[dict]) -> dict[str, list[int]]:
    """name -> indices of facts that write it."""
    producers: dict[str, list[int]] = {}
    for i, f in enumerate(facts):
        for w in f.get("writes", []):
            producers.setdefault(w, []).append(i)
    return producers


def bean_class_map(facts: list[dict]) -> dict[str, str]:
    """Spring bean id -> class, from bean_def facts."""
    out: dict[str, str] = {}
    for f in facts:
        if f.get("kind") == "bean_def":
            cls = f.get("attrs", {}).get("class")
            if cls:
                out[f["subject"]] = cls
    return out


def _simple_class(fqn: str) -> str:
    return fqn.rsplit(".", 1)[-1]


def class_fields(facts: list[dict], fqn: str) -> list[str]:
    """The field names produced by a class's own facts (its field logic).

    A fact belongs to the class when its provenance symbol is `<SimpleClass>.…`
    (e.g. `Pricer.calc`). Returns the real field names it produces, skipping the
    synthetic `bean:`/`class:` routing names.
    """
    sc = _simple_class(fqn)
    names: list[str] = []
    for f in facts:
        sym = (f.get("provenance") or {}).get("symbol") or ""
        if sym.split(".", 1)[0] != sc:
            continue
        for n in [f.get("subject"), *f.get("writes", [])]:
            if n and not n.startswith(("bean:", "class:", "process:")) and n not in names:
                names.append(n)
    return names


def _detail(f: dict) -> str:
    a = f.get("attrs", {})
    return a.get("expr") or a.get("template") or a.get("stylesheet") or a.get("type") or a.get("uri") or ""


def trace(target: str, facts: list[dict], *, producers=None, beans=None, seen=None) -> dict[str, Any]:
    """Backward lineage of `target` as a nested tree. Each producing fact becomes
    a node with its upstream reads (and, for a bean step, the resolved class's
    field logic) recursively traced."""
    producers = producers if producers is not None else build_producers(facts)
    beans = beans if beans is not None else bean_class_map(facts)
    seen = seen if seen is not None else set()

    node: dict[str, Any] = {"name": target, "produced_by": []}
    if target in seen:
        node["cycle"] = True
        return node
    seen = seen | {target}

    hits = producers.get(target, [])
    if not hits:
        node["gap"] = True   # read/needed but nothing produces it — honest stop
        return node

    for i in hits:
        f = facts[i]
        pv = f.get("provenance", {}) or {}
        entry: dict[str, Any] = {
            "kind": f.get("kind"),
            "parser": pv.get("parser"),
            "file": pv.get("file"),
            "line": pv.get("line_start"),
            "symbol": pv.get("symbol"),
            "detail": _detail(f),
            "upstream": [],
        }
        if f.get("kind") == "route_bean":
            cls = beans.get(f.get("attrs", {}).get("bean_id"))
            if cls:
                entry["resolved_class"] = cls
                for fld in class_fields(facts, cls):
                    entry["upstream"].append(trace(fld, facts, producers=producers, beans=beans, seen=seen))
        for r in f.get("reads", []):
            entry["upstream"].append(trace(r, facts, producers=producers, beans=beans, seen=seen))
        node["produced_by"].append(entry)
    return node


def discover_targets(facts: list[dict]) -> list[str]:
    """The endpoints of lineage worth tracing: declared fields if any, else the
    sinks — names written but never read (output endpoints, terminal outputs)."""
    declared = [f["subject"] for f in facts if f.get("kind") == "field_decl"]
    if declared:
        return sorted(set(declared))
    written, read = set(), set()
    for f in facts:
        written.update(f.get("writes", []))
        read.update(f.get("reads", []))
    sinks = {n for n in written - read if not n.startswith(("bean:", "class:", "process:"))}
    return sorted(sinks)


def flatten(node: dict, depth: int = 0) -> list[tuple[int, dict]]:
    """Pre-order (depth, node) list, for display."""
    rows: list[tuple[int, dict]] = []
    for e in node.get("produced_by", []):
        rows.append((depth, {"name": node["name"], **e}))
        for up in e.get("upstream", []):
            rows.extend(flatten(up, depth + 1))
    if not node.get("produced_by"):
        rows.append((depth, {"name": node["name"], "gap": node.get("gap", False)}))
    return rows
