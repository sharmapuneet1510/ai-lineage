"""Parser type string -> Parser class."""
from app.parsing.parsers.base import Parser

_PARSERS: dict[str, type] = {}


class RegistryError(Exception):
    pass


def register(cls: type) -> type:
    """Class decorator. Registers a parser under its `type` class var."""
    parser_type = getattr(cls, "type", None)
    if not parser_type:
        raise RegistryError(f"{cls.__name__} has no `type` class var")
    if parser_type in _PARSERS:
        raise RegistryError(f"parser type {parser_type!r} is already registered")
    _PARSERS[parser_type] = cls
    return cls


def get_parser(parser_type: str) -> Parser:
    """Return a parser instance. Raises RegistryError if unregistered."""
    cls = _PARSERS.get(parser_type)
    if cls is None:
        raise RegistryError(
            f"unknown parser type {parser_type!r}; "
            f"registered: {registered_types()}"
        )
    return cls()


def registered_types() -> list[str]:
    return sorted(_PARSERS)
