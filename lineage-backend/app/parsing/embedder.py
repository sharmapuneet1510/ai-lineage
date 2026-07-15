"""Optional semantic search.

Anthropic does not offer an embeddings endpoint — their docs point to Voyage AI
— so semantic search cannot ride on the user-provided LLM API. A hosted
embedder would therefore be a second mandatory external service, which
CLAUDE_INSTRUCTIONS.md §2 forbids.

Resolution: this is a port. The default is NullEmbedder (full-text search works
with no embedder at all). LocalEmbedder runs an open-weight model offline, with
nothing leaving the machine. HostedEmbedder is an explicit opt-in that sends
source fragments to a third party.

The ML libraries are an OPTIONAL EXTRA. They are deliberately not in
requirements.txt — installing them is what turns semantic search on.
"""
from typing import Protocol

LOCAL_MODEL = "voyage-4-nano"    # open-weight, Apache 2.0
HOSTED_MODEL = "voyage-code-3"   # hosted; better on a code corpus


class EmbedderUnavailable(Exception):
    """The optional ML extra is not installed."""


class Embedder(Protocol):
    def embed(self, texts: list[str]) -> list[list[float]]: ...


class NullEmbedder:
    """The default. Semantic search off; full-text search unaffected."""

    def embed(self, texts: list[str]) -> list[list[float]]:
        # One empty vector per input — never drop the length, so a future
        # `zip(texts, embedder.embed(texts))` caller gets a length mismatch
        # loudly instead of silently zero pairs.
        return [[] for _ in texts]


class LocalEmbedder:
    """Open-weight model, run offline. Nothing leaves the machine."""

    def __init__(self, model: str = LOCAL_MODEL) -> None:
        self.model = model
        self._encoder = None

    def embed(self, texts: list[str]) -> list[list[float]]:
        if self._encoder is None:
            try:
                sentence_transformers = _import_sentence_transformers()
            except ImportError as exc:
                raise EmbedderUnavailable(
                    "local embeddings need the optional extra: "
                    "pip install sentence-transformers"
                ) from exc
            self._encoder = sentence_transformers.SentenceTransformer(self.model)
        return [list(v) for v in self._encoder.encode(texts)]


class HostedEmbedder:
    """Hosted Voyage. Sends source fragments off-machine — opt-in only."""

    def __init__(self, api_key: str, model: str = HOSTED_MODEL) -> None:
        if not api_key:
            raise ValueError("HostedEmbedder requires an api_key")
        self.api_key = api_key
        self.model = model
        self._client = None

    def embed(self, texts: list[str]) -> list[list[float]]:
        if self._client is None:
            try:
                voyageai = _import_voyageai()
            except ImportError as exc:
                raise EmbedderUnavailable(
                    "hosted embeddings need the optional extra: "
                    "pip install voyageai"
                ) from exc
            self._client = voyageai.Client(api_key=self.api_key)
        result = self._client.embed(texts, model=self.model, input_type="document")
        return result.embeddings


def get_embedder(mode: str = "none", **kwargs) -> Embedder:
    if mode == "none":
        return NullEmbedder()
    if mode == "local":
        return LocalEmbedder(**kwargs)
    if mode == "hosted":
        return HostedEmbedder(**kwargs)
    raise ValueError(f"unknown embedder mode {mode!r}: use none, local, or hosted")


# Indirected so tests can monkeypatch the import without touching sys.modules.
def _import_sentence_transformers():
    import sentence_transformers

    return sentence_transformers


def _import_voyageai():
    import voyageai

    return voyageai
