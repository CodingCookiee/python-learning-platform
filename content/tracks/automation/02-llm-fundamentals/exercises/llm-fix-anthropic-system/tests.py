import httpx
from plp import hidden, test
from plp_fakes import anthropic_api
from solution import SYSTEM, summarise_ticket

TICKET = "Order #1042 arrived with a cracked screen, customer wants a replacement."
SUMMARY = "Cracked screen on order #1042; customer wants a replacement."


def send(ticket=TICKET, model="claude-haiku-4-5"):
    """Call summarise_ticket against a fake API; return the fake (to inspect) and the result."""
    api = anthropic_api([SUMMARY])
    http = httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")
    return api, summarise_ticket(http, ticket, api_key="sk-ant-test", model=model)


@test("Returns the summary, like the example")
def _():
    api = anthropic_api([SUMMARY])
    http = httpx.Client(transport=api.transport, base_url="https://api.anthropic.com")
    assert summarise_ticket(http, TICKET, api_key="sk-ant-test", model="claude-haiku-4-5") == SUMMARY


@test("Sends the instructions as the top-level system field")
def _():
    api, _ = send()
    assert api.last.json.get("system") == SYSTEM


@test("The messages contain only the ticket, as one user message")
def _():
    api, _ = send()
    assert [m["role"] for m in api.last.json["messages"]] == ["user"]
    assert api.last.json["messages"] == [{"role": "user", "content": TICKET}]


@hidden("Keeps the model, max_tokens and headers")
def _():
    api, _ = send(model="claude-sonnet-5")
    assert api.last.json["model"] == "claude-sonnet-5"
    assert api.last.json["max_tokens"] == 100
    assert api.last["headers"]["x-api-key"] == "sk-ant-test"
    assert api.last["headers"]["anthropic-version"] == "2023-06-01"
