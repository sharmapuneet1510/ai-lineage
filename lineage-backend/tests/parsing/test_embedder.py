import pytest

from app.parsing.embedder import (
    EmbedderUnavailable,
    HostedEmbedder,
    LocalEmbedder,
    NullEmbedder,
    get_embedder,
)


def test_default_is_the_null_embedder():
    embedder = get_embedder()
    assert isinstance(embedder, NullEmbedder)


def test_null_embedder_returns_one_empty_vector_per_input():
    # Full-text search must work with no embedder configured, but the
    # returned list must stay the same length as the input so a future
    # `zip(texts, embedder.embed(texts))` caller doesn't silently get zero
    # pairs instead of a length mismatch.
    assert NullEmbedder().embed(["price", "discount"]) == [[], []]
    assert NullEmbedder().embed([]) == []


def test_unknown_mode_is_rejected():
    with pytest.raises(ValueError, match="unknown embedder mode"):
        get_embedder(mode="telepathy")


def test_local_embedder_reports_the_missing_optional_extra(monkeypatch):
    monkeypatch.setattr(
        "app.parsing.embedder._import_sentence_transformers",
        lambda: (_ for _ in ()).throw(ImportError("no module")),
    )
    with pytest.raises(EmbedderUnavailable, match="pip install"):
        LocalEmbedder().embed(["price"])


def test_hosted_embedder_reports_the_missing_optional_extra(monkeypatch):
    monkeypatch.setattr(
        "app.parsing.embedder._import_voyageai",
        lambda: (_ for _ in ()).throw(ImportError("no module")),
    )
    with pytest.raises(EmbedderUnavailable, match="pip install"):
        HostedEmbedder(api_key="k").embed(["price"])


def test_hosted_embedder_requires_an_api_key():
    with pytest.raises(ValueError, match="api_key"):
        HostedEmbedder(api_key="")
