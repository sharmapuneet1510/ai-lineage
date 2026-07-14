"""Declarative parse configuration.

Declares WHAT to parse and WITH WHICH parser. Extraction logic stays in code —
this is deliberately not a DSL. No domain concept is compiled into the package
(Rule 5).
"""
from enum import Enum
from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, Field, ValidationError

SUPPORTED_VERSIONS = {1}


class ConfigError(Exception):
    """Raised for any invalid config. Always fatal — the run cannot proceed."""


class FailOn(str, Enum):
    NEVER = "never"  # record issues and continue (recommended)
    ERROR = "error"  # abort on the first error-severity issue


class ParserBinding(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: str
    include: list[str]
    exclude: list[str] = []
    options: dict = {}


class ModuleConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    root: str
    parsers: list[ParserBinding] = Field(min_length=1)


class XsdStore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str
    root: str
    include: list[str] = ["**/*.xsd"]


class Options(BaseModel):
    model_config = ConfigDict(extra="forbid")

    encoding: str = "utf-8"
    fail_on: FailOn = FailOn.NEVER
    output_dir: str = "./out"


class ParseConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    version: int
    modules: list[ModuleConfig] = Field(min_length=1)
    xsd_stores: list[XsdStore] = []
    options: Options = Options()

    # Set by load_config. All `root` values resolve against this.
    config_dir: Path = Path(".")

    def resolve(self, root: str) -> Path:
        return (self.config_dir / root).resolve()


def load_config(path: Path) -> ParseConfig:
    """Load and validate a config file. Raises ConfigError on any problem."""
    path = Path(path)
    try:
        raw = yaml.safe_load(path.read_text())
    except yaml.YAMLError as exc:
        raise ConfigError(f"{path}: malformed YAML: {exc}") from exc
    except OSError as exc:
        raise ConfigError(f"{path}: cannot read config: {exc}") from exc

    if not isinstance(raw, dict):
        raise ConfigError(f"{path}: config must be a YAML mapping")

    if "config_dir" in raw:
        raise ConfigError(f"{path}: config_dir is managed internally and cannot be set")

    try:
        config = ParseConfig.model_validate({**raw, "config_dir": path.parent})
    except ValidationError as exc:
        raise ConfigError(f"{path}: {exc}") from exc

    if config.version not in SUPPORTED_VERSIONS:
        raise ConfigError(
            f"{path}: unsupported config version {config.version}; "
            f"supported: {sorted(SUPPORTED_VERSIONS)}"
        )

    _reject_duplicate_names(path, config)
    _reject_missing_roots(path, config)
    return config


def _reject_duplicate_names(path: Path, config: ParseConfig) -> None:
    for label, names in (
        ("module", [m.name for m in config.modules]),
        ("xsd_store", [s.name for s in config.xsd_stores]),
    ):
        seen: set[str] = set()
        for name in names:
            if name in seen:
                raise ConfigError(f"{path}: duplicate {label} name {name!r}")
            seen.add(name)


def _reject_missing_roots(path: Path, config: ParseConfig) -> None:
    roots = [(m.name, m.root) for m in config.modules]
    roots += [(s.name, s.root) for s in config.xsd_stores]
    for name, root in roots:
        resolved = config.resolve(root)
        if not resolved.is_dir():
            raise ConfigError(
                f"{path}: root for {name!r} does not exist: {resolved}"
            )
