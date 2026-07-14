from datetime import datetime
from typing import Iterator

import pytest

from app.parsing import registry
from app.parsing.facts import Fact, ParseIssue, Provenance
from app.parsing.registry import RegistryError, get_parser, register, registered_types


@pytest.fixture(autouse=True)
def clean_registry():
    """Each test gets a pristine registry."""
    saved = dict(registry._PARSERS)
    registry._PARSERS.clear()
    yield
    registry._PARSERS.clear()
    registry._PARSERS.update(saved)


def _make_parser(parser_type: str):
    @register
    class _Fake:
        type = parser_type
        version = "0.1.0"

        def parse(self, source: str, base: Provenance) -> Iterator[Fact | ParseIssue]:
            yield Fact(kind="fake", subject=source, provenance=base)

    return _Fake


def test_register_then_get_returns_an_instance():
    _make_parser("fake")
    parser = get_parser("fake")
    assert parser.type == "fake"
    assert parser.version == "0.1.0"


def test_registered_types_is_sorted():
    _make_parser("zzz")
    _make_parser("aaa")
    assert registered_types() == ["aaa", "zzz"]


def test_duplicate_registration_is_rejected():
    _make_parser("fake")
    with pytest.raises(RegistryError, match="already registered"):
        _make_parser("fake")


def test_unknown_type_is_rejected_and_lists_known_types():
    _make_parser("xml")
    with pytest.raises(RegistryError, match="xml"):
        get_parser("java")


def test_a_registered_parser_yields_facts():
    _make_parser("fake")
    prov = Provenance(
        module="m",
        file="f",
        source_hash="h",
        parser="fake",
        parser_version="0.1.0",
        parsed_at=datetime(2026, 7, 14),
    )
    facts = list(get_parser("fake").parse("hello", prov))
    assert len(facts) == 1
    assert facts[0].subject == "hello"
