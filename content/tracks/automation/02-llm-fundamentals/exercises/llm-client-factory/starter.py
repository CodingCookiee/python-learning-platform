import logging
import os
from dataclasses import dataclass

import httpx

log = logging.getLogger(__name__)

ANTHROPIC_URL = "https://api.anthropic.com"
OPENAI_URL = "https://api.openai.com"
DEFAULT_ANTHROPIC_MODEL = "claude-haiku-4-5"


@dataclass
class Usage:
    input_tokens: int
    output_tokens: int


@dataclass
class LLMResponse:
    text: str
    tool_calls: list
    stop_reason: str
    usage: Usage
    model: str


# Cut-down adapters (text only) so this drill is about the factory. Your full ones from the last
# two drills have exactly the same constructor.


class AnthropicClient:
    def __init__(self, http, *, api_key, model):
        self._http, self._api_key, self.model = http, api_key, model

    def __repr__(self):
        return f"AnthropicClient(model={self.model!r})"

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        body = {"model": model or self.model, "max_tokens": max_tokens, "messages": messages}
        if system:
            body["system"] = system
        headers = {"x-api-key": self._api_key, "anthropic-version": "2023-06-01"}
        response = self._http.post("/v1/messages", headers=headers, json=body)
        response.raise_for_status()
        data = response.json()
        text = "".join(block["text"] for block in data["content"] if block["type"] == "text")
        usage = Usage(data["usage"]["input_tokens"], data["usage"]["output_tokens"])
        return LLMResponse(text, [], data["stop_reason"], usage, data["model"])


class OpenAIClient:
    def __init__(self, http, *, api_key, model):
        self._http, self._api_key, self.model = http, api_key, model

    def __repr__(self):
        return f"OpenAIClient(model={self.model!r})"

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        sent = ([{"role": "system", "content": system}] if system else []) + messages
        body = {"model": model or self.model, "max_completion_tokens": max_tokens, "messages": sent}
        response = self._http.post("/v1/chat/completions", headers={"Authorization": f"Bearer {self._api_key}"}, json=body)
        response.raise_for_status()
        data = response.json()
        usage = Usage(data["usage"]["prompt_tokens"], data["usage"]["completion_tokens"])
        stop = {"stop": "end_turn", "length": "max_tokens"}.get(data["choices"][0]["finish_reason"], "end_turn")
        return LLMResponse(data["choices"][0]["message"]["content"] or "", [], stop, usage, data["model"])


def make_llm(env=os.environ, *, http=None):
    """The LLM client that the environment asks for."""
    ...
