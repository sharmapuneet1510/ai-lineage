from pathlib import Path

import pytest

from app.parsing.config import ConfigError, FailOn, load_config

VALID = """
version: 1
modules:
  - name: pricing-core
    root: ./src/pricing
    parsers:
      - type: java
        include: ["**/*.java"]
        exclude: ["**/test/**"]
      - type: xslt
        include: ["**/*.xsl"]
xsd_stores:
  - name: outbound
    root: ./schemas/out
options:
  fail_on: never
"""


def _write(tmp_path: Path, text: str) -> Path:
    (tmp_path / "src" / "pricing").mkdir(parents=True, exist_ok=True)
    (tmp_path / "schemas" / "out").mkdir(parents=True, exist_ok=True)
    path = tmp_path / "parse.config.yaml"
    path.write_text(text)
    return path


def test_loads_a_valid_config(tmp_path):
    config = load_config(_write(tmp_path, VALID))
    assert config.version == 1
    assert len(config.modules) == 1
    assert config.modules[0].name == "pricing-core"
    assert len(config.modules[0].parsers) == 2
    assert config.modules[0].parsers[0].type == "java"
    assert config.modules[0].parsers[0].exclude == ["**/test/**"]
    assert config.xsd_stores[0].name == "outbound"


def test_defaults_are_applied(tmp_path):
    config = load_config(_write(tmp_path, VALID))
    assert config.options.encoding == "utf-8"
    assert config.options.fail_on == FailOn.NEVER
    assert config.options.output_dir == "./out"
    # exclude defaults to empty; xsd_store include defaults to **/*.xsd
    assert config.modules[0].parsers[1].exclude == []
    assert config.xsd_stores[0].include == ["**/*.xsd"]


def test_config_dir_is_the_configs_own_directory(tmp_path):
    config = load_config(_write(tmp_path, VALID))
    assert config.config_dir == tmp_path


def test_unsupported_version_is_rejected(tmp_path):
    bad = VALID.replace("version: 1", "version: 99")
    with pytest.raises(ConfigError, match="version"):
        load_config(_write(tmp_path, bad))


def test_missing_modules_is_rejected(tmp_path):
    with pytest.raises(ConfigError):
        load_config(_write(tmp_path, "version: 1\nmodules: []\n"))


def test_duplicate_module_names_are_rejected(tmp_path):
    dupe = """
version: 1
modules:
  - name: dupe
    root: ./src/pricing
    parsers:
      - type: xml
        include: ["**/*.xml"]
  - name: dupe
    root: ./src/pricing
    parsers:
      - type: xml
        include: ["**/*.xml"]
"""
    with pytest.raises(ConfigError, match="duplicate"):
        load_config(_write(tmp_path, dupe))


def test_missing_root_directory_is_rejected(tmp_path):
    bad = VALID.replace("./src/pricing", "./does/not/exist")
    with pytest.raises(ConfigError, match="does not exist"):
        load_config(_write(tmp_path, bad))


def test_malformed_yaml_is_rejected(tmp_path):
    with pytest.raises(ConfigError):
        load_config(_write(tmp_path, "version: 1\n  modules: [oops\n"))


def test_duplicate_xsd_store_names_are_rejected(tmp_path):
    dupe = """
version: 1
modules:
  - name: pricing-core
    root: ./src/pricing
    parsers:
      - type: xml
        include: ["**/*.xml"]
xsd_stores:
  - name: dupe
    root: ./schemas/out
  - name: dupe
    root: ./schemas/out
"""
    with pytest.raises(ConfigError, match="duplicate"):
        load_config(_write(tmp_path, dupe))


def test_unknown_top_level_key_is_rejected(tmp_path):
    bad = """
version: 1
modules:
  - name: pricing-core
    root: ./src/pricing
    parsers:
      - type: java
        include: ["**/*.java"]
xsd_store:
  name: outbound
  root: ./schemas/out
"""
    with pytest.raises(ConfigError):
        load_config(_write(tmp_path, bad))


def test_unknown_module_key_is_rejected(tmp_path):
    # `root:` is kept (it's required) and a genuinely extra key is added, so
    # this actually exercises extra="forbid" at the module level rather than
    # merely tripping the required-field check.
    bad = """
version: 1
modules:
  - name: pricing-core
    root: ./src/pricing
    bogus: oops
    parsers:
      - type: java
        include: ["**/*.java"]
"""
    with pytest.raises(ConfigError):
        load_config(_write(tmp_path, bad))


def test_unknown_options_key_is_rejected(tmp_path):
    bad = VALID + "  output_dr: /tmp\n"
    with pytest.raises(ConfigError):
        load_config(_write(tmp_path, bad))


def test_absolute_include_pattern_is_rejected(tmp_path):
    # `root.glob("/abs/*.xml")` raises NotImplementedError at the walker,
    # uncaught, with no ParseIssue — a raw crash. Must be rejected at
    # config-load time instead, with a clean, actionable ConfigError.
    bad = VALID.replace('include: ["**/*.java"]', 'include: ["/abs/*.java"]')
    with pytest.raises(ConfigError, match="pricing-core"):
        load_config(_write(tmp_path, bad))


def test_malformed_double_star_include_pattern_is_rejected(tmp_path):
    # `root.glob("**a/**")` raises ValueError at the walker, uncaught, with
    # no ParseIssue — a raw crash. Must be rejected at config-load time.
    bad = VALID.replace('include: ["**/*.java"]', 'include: ["**a/**"]')
    with pytest.raises(ConfigError, match="pricing-core"):
        load_config(_write(tmp_path, bad))


def test_bad_exclude_pattern_is_rejected(tmp_path):
    bad = VALID.replace('exclude: ["**/test/**"]', 'exclude: ["/abs/**"]')
    with pytest.raises(ConfigError):
        load_config(_write(tmp_path, bad))


def test_bad_xsd_store_include_pattern_is_rejected(tmp_path):
    bad = VALID.replace("root: ./schemas/out", 'root: ./schemas/out\n    include: ["**a/**"]')
    with pytest.raises(ConfigError, match="outbound"):
        load_config(_write(tmp_path, bad))


def test_config_dir_key_in_yaml_is_rejected(tmp_path):
    bad = """
version: 1
modules:
  - name: pricing-core
    root: ./src/pricing
    parsers:
      - type: java
        include: ["**/*.java"]
config_dir: ./invalid
"""
    with pytest.raises(ConfigError):
        load_config(_write(tmp_path, bad))
