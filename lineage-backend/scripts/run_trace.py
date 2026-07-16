"""Tracing stage CLI: parsed facts -> lineage.json.

    cd lineage-backend
    python3 scripts/run_trace.py --out ../lineage-viewer/data

Reads the parse run's facts, traces every target (declared fields, or output
sinks), and writes lineage.json: one resolved backward chain per target. Parsed
facts are never modified.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.tracing.trace import (  # noqa: E402
    bean_class_map, build_producers, discover_targets, flatten, trace,
)


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
            if line:
                obj = json.loads(line)
                if obj.get("record") != "issue":
                    facts.append(obj)
        return facts
    raise SystemExit(f"no facts.jsonl or evidence.idx in {out_dir}")


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(description="Trace parsed facts into lineage.")
    ap.add_argument("--out", required=True, help="parse output dir")
    ap.add_argument("--target", action="append", help="only this target (repeatable)")
    ap.add_argument("--print", action="store_true", help="also print the chains")
    args = ap.parse_args(argv)

    out_dir = Path(args.out)
    facts = load_facts(out_dir)
    producers = build_producers(facts)
    beans = bean_class_map(facts)

    if args.target:
        targets = args.target
    else:
        # every produced name gets a trace so any field in the viewer resolves;
        # skip the synthetic routing names (they appear inside the chains).
        targets = sorted(n for n in producers if not n.startswith(("bean:", "class:", "process:")))

    lineage, cache = {}, {}   # one shared cache -> subtrees computed once across targets
    for t in targets:
        lineage[t] = trace(t, facts, producers=producers, beans=beans, cache=cache)

    (out_dir / "lineage.json").write_text(json.dumps(lineage, indent=2), encoding="utf-8")
    print(f"traced {len(targets)} target(s) -> {out_dir/'lineage.json'}")

    if args.print:
        for t in targets:
            print(f"\n{t}")
            for depth, hop in flatten(lineage[t]):
                if hop.get("gap"):
                    print("  " * (depth + 1) + f"← {hop['name']}  (GAP — no producing fact)")
                    continue
                loc = f"{hop.get('file','')}:{hop.get('line','')} [{hop.get('parser','')}]"
                extra = f"  {hop['detail']}" if hop.get("detail") else ""
                if hop.get("resolved_class"):
                    extra += f"   → class {hop['resolved_class']}"
                print("  " * (depth + 1) + f"← {hop['name']:24} {loc:26}{extra}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
