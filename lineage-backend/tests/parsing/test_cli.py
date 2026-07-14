import json

from scripts.run_parse import main

CONFIG = """
version: 1
modules:
  - name: order-intake
    root: ./src
    parsers:
      - type: xml
        include: ["**/*.xml"]
options:
  output_dir: ./out
"""


def _project(tmp_path, config: str = CONFIG) -> str:
    (tmp_path / "src").mkdir()
    (tmp_path / "src" / "order.xml").write_text("<order><price>42</price></order>")
    path = tmp_path / "parse.config.yaml"
    path.write_text(config)
    return str(path)


def test_successful_run_exits_zero_and_writes_all_four_artifacts(tmp_path):
    code = main(["--config", _project(tmp_path)])
    assert code == 0

    out = tmp_path / "out"
    assert (out / "facts.jsonl").exists()
    assert (out / "fields.json").exists()
    assert (out / "evidence.idx").exists()
    assert (out / "run_summary.json").exists()

    summary = json.loads((out / "run_summary.json").read_text())
    assert summary["files_parsed"] == 1
    assert summary["facts_by_kind"]["element"] == 2


def test_out_flag_overrides_the_config_output_dir(tmp_path):
    elsewhere = tmp_path / "elsewhere"
    code = main(["--config", _project(tmp_path), "--out", str(elsewhere)])
    assert code == 0
    assert (elsewhere / "facts.jsonl").exists()


def test_missing_config_exits_one(tmp_path):
    assert main(["--config", str(tmp_path / "nope.yaml")]) == 1


def test_malformed_file_still_exits_zero_under_fail_on_never(tmp_path):
    config_path = _project(tmp_path)
    (tmp_path / "src" / "bad.xml").write_text("<order><unclosed></order>")

    assert main(["--config", config_path]) == 0

    summary = json.loads((tmp_path / "out" / "run_summary.json").read_text())
    assert summary["issues_by_severity"]["error"] == 1


def test_fail_on_error_flag_exits_one(tmp_path):
    config_path = _project(tmp_path)
    (tmp_path / "src" / "bad.xml").write_text("<order><unclosed></order>")

    assert main(["--config", config_path, "--fail-on", "error"]) == 1
