import httpx
from plp import hidden, test
from plp_fakes import openai_api
from solution import ask_gpt

REPLY = "SSO is included in the Business plan."


def connect(api):
    return httpx.Client(transport=api.transport, base_url="https://api.openai.com")


@test("Returns the reply text, like the example")
def _():
    api = openai_api([REPLY])
    assert ask_gpt(connect(api), "Which plan includes SSO?", api_key="sk-test", model="gpt-fake") == REPLY


@test("Sends the key as a bearer token")
def _():
    api = openai_api([REPLY])
    ask_gpt(connect(api), "Which plan includes SSO?", api_key="sk-test-123", model="gpt-fake")
    assert api.last["headers"].get("authorization") == "Bearer sk-test-123"


@test("Doesn't send the key anywhere else")
def _():
    api = openai_api([REPLY])
    ask_gpt(connect(api), "Which plan includes SSO?", api_key="sk-test-123", model="gpt-fake")
    assert "x-api-key" not in api.last["headers"]
    assert "sk-test-123" not in api.last["body"], "the key should only be in the Authorization header"


@hidden("Still sends the question and model")
def _():
    api = openai_api([REPLY])
    ask_gpt(connect(api), "Do you offer annual billing?", api_key="sk-test", model="gpt-fake-large")
    assert api.last.json == {
        "model": "gpt-fake-large",
        "messages": [{"role": "user", "content": "Do you offer annual billing?"}],
    }
