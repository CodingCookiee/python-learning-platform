import httpx
from plp import hidden, raises, test
from plp_fakes import anthropic_api
from solution import ask_claude

REPLY = "Our policy allows refunds within 30 days, so order #1042 isn't eligible."
QUESTION = "Is order #1042 eligible for a refund after 40 days?"


def connect(api):
    return httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")


@test("Returns the reply text, like the example")
def _():
    api = anthropic_api([REPLY])
    assert ask_claude(connect(api), QUESTION, api_key="sk-ant-test", model="claude-haiku-4-5") == REPLY


@test("Posts to /v1/messages with the key and version headers")
def _():
    api = anthropic_api([REPLY])
    ask_claude(connect(api), QUESTION, api_key="sk-ant-test", model="claude-haiku-4-5")
    assert api.last["method"] == "POST"
    assert api.last["path"] == "/v1/messages"
    assert api.last["headers"].get("x-api-key") == "sk-ant-test"
    assert api.last["headers"].get("anthropic-version") == "2023-06-01"


@test("Sends the model, max_tokens and one user message")
def _():
    api = anthropic_api([REPLY])
    ask_claude(connect(api), QUESTION, api_key="sk-ant-test", model="claude-sonnet-5")
    assert api.last.json == {
        "model": "claude-sonnet-5",
        "max_tokens": 500,
        "messages": [{"role": "user", "content": QUESTION}],
    }


@hidden("Raises HTTPStatusError when the API refuses the request")
def _():
    api = anthropic_api([REPLY])
    http = httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")
    # An empty key is refused with a 401, like the real API
    raises(httpx.HTTPStatusError, ask_claude, http, QUESTION, api_key="", model="claude-haiku-4-5")
