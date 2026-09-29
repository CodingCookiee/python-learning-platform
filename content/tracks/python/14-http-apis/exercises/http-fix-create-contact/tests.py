import json

import httpx

from plp import hidden, raises, test
from solution import create_contact


class FakeCrm:
    """A fake CRM that follows its own docs, and remembers every request it received."""

    def __init__(self):
        self.requests = []
        self.contacts = []

    def __call__(self, request):
        self.requests.append(request)
        if request.url.path != "/v1/contacts":
            return httpx.Response(404, json={"error": "not found"})
        if request.method != "POST":
            return httpx.Response(405, json={"error": "method not allowed"})
        if request.headers.get("content-type") != "application/json":
            return httpx.Response(415, json={"error": "send the contact as JSON"})
        body = json.loads(request.content)
        if "@" not in body.get("email", ""):
            return httpx.Response(422, json={"error": "email is invalid"})
        contact = {"id": f"c_{len(self.contacts) + 1}", **body}
        self.contacts.append(contact)
        return httpx.Response(201, json=contact)

    def client(self):
        return httpx.Client(transport=httpx.MockTransport(self), base_url="https://api.crm.example")


@test("Creates a contact and returns it")
def _():
    crm = FakeCrm()
    assert create_contact(crm.client(), "Ada Lovelace", "ada@example.com", ["vip"]) == {
        "id": "c_1",
        "name": "Ada Lovelace",
        "email": "ada@example.com",
        "tags": ["vip"],
    }


@test("Sends a POST with a JSON body and no query string")
def _():
    crm = FakeCrm()
    create_contact(crm.client(), "Ada Lovelace", "ada@example.com", ["vip", "webinar"])
    [request] = crm.requests
    assert request.method == "POST"
    assert request.url.path == "/v1/contacts"
    assert request.url.query == b"", "Everything belongs in the body, not the query string"
    assert request.headers.get("content-type") == "application/json"
    assert json.loads(request.content) == {"name": "Ada Lovelace", "email": "ada@example.com", "tags": ["vip", "webinar"]}


@test("No tags means an empty JSON list")
def _():
    crm = FakeCrm()
    create_contact(crm.client(), "Grace Hopper", "grace@example.com")
    assert json.loads(crm.requests[0].content)["tags"] == []


@test("A refused contact raises ValueError with the CRM's message")
def _():
    crm = FakeCrm()
    raises(ValueError, create_contact, crm.client(), "Linus", "not-an-email", match="email is invalid")
    assert crm.contacts == []


@hidden("Tuples of tags work too, and each call creates one contact")
def _():
    crm = FakeCrm()
    client = crm.client()
    first = create_contact(client, "Ada Lovelace", "ada@example.com", ("vip",))
    second = create_contact(client, "Grace Hopper", "grace@example.com", ("partner", "uk"))
    assert (first["id"], second["id"]) == ("c_1", "c_2")
    assert second["tags"] == ["partner", "uk"]
    assert len(crm.requests) == 2
