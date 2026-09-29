import json
from dataclasses import dataclass

import httpx


@dataclass
class ToolCall:
    id: str
    name: str
    arguments: dict


@dataclass
class Usage:
    input_tokens: int
    output_tokens: int


@dataclass
class LLMResponse:
    text: str
    tool_calls: list[ToolCall]
    stop_reason: str
    usage: Usage
    model: str


def to_openai_tool(tool):
    return {
        "type": "function",
        "function": {"name": tool["name"], "description": tool.get("description", ""), "parameters": tool["parameters"]},
    }


def to_openai_messages(messages, system=None):
    """Neutral messages (and the system prompt, if any) as OpenAI expects them."""
    translated = [{"role": "system", "content": system}] if system else []
    for message in messages:
        if message["role"] == "assistant" and message.get("tool_calls"):
            translated.append({
                "role": "assistant",
                "content": message.get("content") or None,
                "tool_calls": [
                    {
                        "id": call["id"],
                        "type": "function",
                        "function": {"name": call["name"], "arguments": json.dumps(call["arguments"])},
                    }
                    for call in message["tool_calls"]
                ],
            })
        elif message["role"] == "tool":
            translated.append({"role": "tool", "tool_call_id": message["tool_call_id"], "content": message["content"]})
        else:
            translated.append({"role": message["role"], "content": message["content"]})
    return translated


STOP_REASONS = {"stop": "end_turn", "length": "max_tokens", "tool_calls": "tool_use"}


class OpenAIClient:
    """The neutral LLM interface over OpenAI's Chat Completions API."""

    def __init__(self, http, *, api_key, model):
        self._http = http
        self._api_key = api_key
        self.model = model

    def __repr__(self):
        return f"OpenAIClient(model={self.model!r})"

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        body = {
            "model": model or self.model,
            "max_completion_tokens": max_tokens,
            "messages": to_openai_messages(messages, system),
        }
        if tools:
            body["tools"] = [to_openai_tool(tool) for tool in tools]
        if temperature is not None:
            body["temperature"] = temperature

        response = self._http.post(
            "/v1/chat/completions",
            headers={"Authorization": f"Bearer {self._api_key}"},
            json=body,
        )
        response.raise_for_status()
        data = response.json()

        choice = data["choices"][0]
        message = choice["message"]
        finish = choice["finish_reason"]
        return LLMResponse(
            text=message.get("content") or "",
            tool_calls=[
                ToolCall(id=call["id"], name=call["function"]["name"], arguments=json.loads(call["function"]["arguments"]))
                for call in message.get("tool_calls") or []
            ],
            stop_reason=STOP_REASONS.get(finish, finish),
            usage=Usage(data["usage"]["prompt_tokens"], data["usage"]["completion_tokens"]),
            model=data["model"],
        )
