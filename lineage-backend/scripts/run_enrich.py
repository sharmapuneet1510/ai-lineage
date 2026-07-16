"""Explain stage CLI: read a parse run's facts, generate field documentation with
the LLM, and merge it into fields.json (which the viewer reads).

    cd lineage-backend
    ANTHROPIC_API_KEY=... python3 scripts/run_enrich.py --out ../lineage-viewer/data
    # or, offline, without a key:
    python3 scripts/run_enrich.py --out ../lineage-viewer/data --stub

The parsed facts are never modified — only fields.json is written. Each generated
entry carries a `generation` provenance block (prompt id/version, model, evidence).
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.enrich.enrich import enrich_field, is_produced  # noqa: E402
from app.enrich.llm import AnthropicLLMClient, LLMError, StubLLMClient  # noqa: E402
from app.enrich.prompts import get_prompt  # noqa: E402


def load_facts(out_dir: Path) -> list[dict]:
    ev = out_dir / "evidence.idx"
    if ev.exists():
        data = json.loads(ev.read_text(encoding="utf-8"))
        if isinstance(data.get("facts"), list):
            return data["facts"]
    fj = out_dir / "facts.jsonl"
    if fj.exists():
        facts = []
        for line in fj.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            if obj.get("record") != "issue":
                facts.append(obj)
        return facts
    raise SystemExit(f"no facts.jsonl or evidence.idx in {out_dir}")


def produced_fields(facts: list[dict]) -> dict[str, list[dict]]:
    """Map each produced field name -> the facts that reference it."""
    names: set[str] = set()
    for f in facts:
        if f.get("subject"):
            names.add(f["subject"])
        for w in f.get("writes") or []:
            names.add(w)
    fields: dict[str, list[dict]] = {}
    for name in names:
        if not is_produced(name, facts):
            continue
        fields[name] = [
            f for f in facts
            if f.get("subject") == name
            or name in (f.get("writes") or [])
            or name in (f.get("reads") or [])
        ]
    return fields


def group_of(name: str, facts: list[dict]) -> str | None:
    for f in facts:
        if f.get("subject") == name or name in (f.get("writes") or []):
            return (f.get("provenance") or {}).get("module")
    return None


def merge_fields_json(out_dir: Path, docs: list[dict]) -> None:
    path = out_dir / "fields.json"
    existing = {}
    if path.exists():
        try:
            for row in json.loads(path.read_text(encoding="utf-8")).get("fields", []):
                existing[row["name"]] = row
        except (json.JSONDecodeError, KeyError, TypeError):
            pass
    for d in docs:
        existing[d["name"]] = {**existing.get(d["name"], {}), **d}
    path.write_text(json.dumps({"fields": list(existing.values())}, indent=2), encoding="utf-8")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Generate field docs from parsed facts.")
    ap.add_argument("--out", required=True, help="parse output dir (holds facts / writes fields.json)")
    ap.add_argument("--field", action="append", help="only this field (repeatable)")
    ap.add_argument("--stub", action="store_true", help="offline placeholder generation, no API key")
    ap.add_argument("--model", default="claude-opus-4-8")
    args = ap.parse_args(argv)

    out_dir = Path(args.out)
    facts = load_facts(out_dir)
    fields = produced_fields(facts)
    if args.field:
        wanted = set(args.field)
        fields = {k: v for k, v in fields.items() if k in wanted}
    if not fields:
        print("no produced fields to enrich", file=sys.stderr)
        return 0

    try:
        llm = StubLLMClient() if args.stub else AnthropicLLMClient(model=args.model)
    except LLMError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1

    prompt = get_prompt("field_explain")
    docs = []
    for name, field_facts in sorted(fields.items()):
        try:
            doc = enrich_field(name, field_facts, llm, prompt, group=group_of(name, facts))
        except LLMError as exc:
            print(f"  {name}: skipped ({exc})", file=sys.stderr)
            continue
        if doc is None:
            continue
        docs.append(doc.model_dump(mode="json"))
        print(f"  {name}: generated ({doc.generation.fact_count} facts, {llm.model})")

    merge_fields_json(out_dir, docs)
    print(f"\nwrote {len(docs)} field doc(s) to {out_dir/'fields.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
