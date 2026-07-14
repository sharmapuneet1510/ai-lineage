"""Where facts go. Parsers never touch a database.

Sub-project #2's graph writer is just another FactSink implementation — that is
the point of this seam.
"""
import json
from pathlib import Path
from typing import Protocol

from app.parsing.facts import Fact, ParseIssue


class FactSink(Protocol):
    def emit(self, item: Fact | ParseIssue) -> None: ...
    def close(self) -> None: ...


class InMemoryFactSink:
    """For tests. Keeps everything in a list."""

    def __init__(self) -> None:
        self.items: list[Fact | ParseIssue] = []

    def emit(self, item: Fact | ParseIssue) -> None:
        self.items.append(item)

    def close(self) -> None:
        pass

    @property
    def facts(self) -> list[Fact]:
        return [i for i in self.items if isinstance(i, Fact)]

    @property
    def issues(self) -> list[ParseIssue]:
        return [i for i in self.items if isinstance(i, ParseIssue)]


class JsonlFactSink:
    """One JSON object per line. Replayable and diffable between runs."""

    def __init__(self, path: Path) -> None:
        self.path = Path(path)
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._handle = self.path.open("w", encoding="utf-8")

    def emit(self, item: Fact | ParseIssue) -> None:
        record = "fact" if isinstance(item, Fact) else "issue"
        payload = {"record": record, **item.model_dump(mode="json")}
        self._handle.write(json.dumps(payload) + "\n")

    def close(self) -> None:
        self._handle.close()

    def __enter__(self) -> "JsonlFactSink":
        return self

    def __exit__(self, *exc_info: object) -> None:
        self.close()
