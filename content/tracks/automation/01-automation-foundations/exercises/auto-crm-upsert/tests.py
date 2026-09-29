import re

import httpx
from plp import hidden, raises, test
from plp_fakes import fake_api
from solution import upsert_contact

AMIRA = {"email": " Amira@Example.com ", "name": "Amira Haddad", "company": "Haddad Physio"}


class FakeAirtable:
    """A Contacts table that understands {Email}='...' formulas, with optional 429s."""

    def __init__(self, records=None, throttle=0, retry_after="1"):
        self.records = {r["id"]: r for r in (records or [])}
        self.throttle = throttle          # how many requests to answer with 429 first
        self.retry_after = retry_after
        self.server = fake_api({
            "GET /v0/appAgency/Contacts": self.search,
            "POST /v0/appAgency/Contacts": self.create,
            "PATCH /v0/appAgency/Contacts/{record_id}": self.update,
        })
        self.client = httpx.Client(transport=self.server.transport, base_url="https://api.airtable.com/v0")

    def limited(self):
        if self.throttle:
            self.throttle -= 1
            headers = {"Retry-After": self.retry_after} if self.retry_after else {}
            return (429, {"errors": [{"error": "RATE_LIMIT_REACHED"}]}, headers)
        return None

    def search(self, req):
        if busy := self.limited():
            return busy
        match = re.fullmatch(r"\{Email\}='(.*)'", req["query"].get("filterByFormula", ""))
        wanted = match.group(1).replace("\\'", "'") if match else None
        return {"records": [r for r in self.records.values() if r["fields"].get("Email") == wanted]}

    def create(self, req):
        if busy := self.limited():
            return busy
        record = {"id": f"recNEW{len(self.records) + 1}", "fields": req.json["fields"]}
        self.records[record["id"]] = record
        return record

    def update(self, req, record_id):
        if busy := self.limited():
            return busy
        self.records[record_id]["fields"].update(req.json["fields"])
        return self.records[record_id]


@test("Creates the contact the first time and updates it after that")
def _():
    crm = FakeAirtable()
    assert upsert_contact(crm.client, "appAgency", AMIRA, sleep=lambda s: None) == ("recNEW1", "created")
    assert upsert_contact(crm.client, "appAgency", AMIRA, sleep=lambda s: None) == ("recNEW1", "updated")
    assert len(crm.records) == 1


@test("Searches by the normalised email")
def _():
    crm = FakeAirtable()
    upsert_contact(crm.client, "appAgency", AMIRA, sleep=lambda s: None)
    assert crm.server.requests[0]["query"] == {"filterByFormula": "{Email}='amira@example.com'"}


@test("Creates with the fields the lead has")
def _():
    crm = FakeAirtable()
    upsert_contact(crm.client, "appAgency", AMIRA, sleep=lambda s: None)
    assert crm.server.calls("POST /v0/appAgency/Contacts")[0].json == {
        "fields": {"Email": "amira@example.com", "Name": "Amira Haddad", "Company": "Haddad Physio"}
    }


@test("Never wipes an existing value with a blank one")
def _():
    existing = {"id": "recOLD7", "fields": {"Email": "tom@example.com", "Name": "Tom", "Phone": "+447700900456"}}
    crm = FakeAirtable([existing])
    lead = {"email": "tom@example.com", "name": "Tom Price", "company": "", "phone": None}
    assert upsert_contact(crm.client, "appAgency", lead, sleep=lambda s: None) == ("recOLD7", "updated")
    assert crm.records["recOLD7"]["fields"] == {"Email": "tom@example.com", "Name": "Tom Price", "Phone": "+447700900456"}


@hidden("Waits for Retry-After on 429 and tries again")
def _():
    waits = []
    crm = FakeAirtable(throttle=2, retry_after="2")
    assert upsert_contact(crm.client, "appAgency", AMIRA, sleep=waits.append) == ("recNEW1", "created")
    assert waits == [2.0, 2.0]


@hidden("Waits 30 seconds when there's no Retry-After, and gives up after 3 attempts")
def _():
    waits = []
    crm = FakeAirtable(throttle=5, retry_after=None)
    raises(httpx.HTTPStatusError, upsert_contact, crm.client, "appAgency", AMIRA, sleep=waits.append)
    assert waits == [30.0, 30.0]
    assert len(crm.server.requests) == 3


@hidden("Escapes quotes in the email inside the formula")
def _():
    crm = FakeAirtable()
    lead = {"email": "Sean.O'Brien@Example.ie", "name": "Seán O'Brien"}
    upsert_contact(crm.client, "appAgency", lead, sleep=lambda s: None)
    assert crm.server.requests[0]["query"]["filterByFormula"] == "{Email}='sean.o\\'brien@example.ie'"
    assert upsert_contact(crm.client, "appAgency", lead, sleep=lambda s: None)[1] == "updated"


@hidden("Other errors raise straight away")
def _():
    server = fake_api({"GET /v0/appAgency/Contacts": (401, {"error": "AUTHENTICATION_REQUIRED"})})
    client = httpx.Client(transport=server.transport, base_url="https://api.airtable.com/v0")
    raises(httpx.HTTPStatusError, upsert_contact, client, "appAgency", AMIRA, sleep=lambda s: None)
    assert len(server.requests) == 1
