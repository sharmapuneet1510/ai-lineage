"""The shared LLM client — the one external service the platform is allowed to
use (CLAUDE_INSTRUCTIONS §2). Isolated behind a protocol so the enrich logic is
testable with no API key, and so the provider can change without touching it.
"""
import json
from typing import Protocol


class LLMError(Exception):
    pass


class LLMClient(Protocol):
    model: str

    def generate_json(self, system: str, user: str, schema: dict) -> dict:
        """Return the model's response parsed against `schema`."""
        ...


class FakeLLMClient:
    """For tests and offline development. Returns a canned response and records
    the prompts it was asked to generate from."""

    def __init__(self, response: dict, model: str = "fake") -> None:
        self.model = model
        self._response = response
        self.calls: list[tuple[str, str]] = []

    def generate_json(self, system: str, user: str, schema: dict) -> dict:
        self.calls.append((system, user))
        return dict(self._response)


class StubLLMClient:
    """Offline demo without an API key: writes a plainly-factual summary derived
    from the facts embedded in the prompt. Clearly marked (model='stub') — it is
    not a language model, just enough to exercise the pipeline end to end."""

    model = "stub"

    def generate_json(self, system: str, user: str, schema: dict) -> dict:
        field = ""
        for line in user.splitlines():
            if line.startswith("Field: "):
                field = line[len("Field: "):].strip()
                break
        return {
            "business_definition": (
                f"[stub] {field}: generated documentation is not available offline. "
                f"Run the enrich stage with an Anthropic API key to produce a real "
                f"definition grounded in this field's parsed facts."
            ),
            "plain_english": {
                "what": f"[stub] What {field} records — pending LLM generation.",
                "when": "[stub] Derivation conditions — pending LLM generation.",
                "why": "[stub] Why it matters — pending LLM generation.",
            },
            "technical_summary": f"[stub] Technical summary for {field} — pending LLM generation.",
        }


class AnthropicLLMClient:
    """Real generation via the Anthropic API. `anthropic` is imported lazily so
    the package (and its tests) load without it installed."""

    def __init__(self, model: str = "claude-opus-4-8", api_key: str | None = None) -> None:
        try:
            import anthropic  # noqa: F401
        except ImportError as exc:  # pragma: no cover - exercised only without the dep
            raise LLMError(
                "the Anthropic SDK is required for real generation: pip install anthropic"
            ) from exc
        import anthropic
        self._client = anthropic.Anthropic(api_key=api_key) if api_key else anthropic.Anthropic()
        self.model = model

    def generate_json(self, system: str, user: str, schema: dict) -> dict:
        resp = self._client.messages.create(
            model=self.model,
            max_tokens=2000,
            system=system,
            messages=[{"role": "user", "content": user}],
            output_config={"format": {"type": "json_schema", "schema": schema}},
        )
        if getattr(resp, "stop_reason", None) == "refusal":
            raise LLMError("model declined to generate for this field")
        text = next((b.text for b in resp.content if getattr(b, "type", None) == "text"), None)
        if text is None:
            raise LLMError("no text in model response")
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise LLMError(f"model did not return valid JSON: {exc}") from exc
