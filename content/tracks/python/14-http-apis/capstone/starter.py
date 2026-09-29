"""A typed, retrying, paginating client for the Pipeline CRM API, used by Millstone Coffee's
wholesale team.

The bottom half of this file is a fake Pipeline CRM server (CrmServer), so everything runs with
no network, in the browser or with:  python crm_client.py

Build the top half: the models, the exceptions and CrmClient. Leave CrmServer as it is.
"""

import json
import logging
import random
import sys
import time
import uuid
from collections import Counter
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Iterator, Literal

import httpx
from pydantic import BaseModel

log = logging.getLogger("crm_client")

BASE_URL = "https://api.pipelinecrm.example/v1"


# Models: Contact and Deal (see the brief for their fields)


# Exceptions: CrmError and everything under it (see the brief for the tree)


class CrmClient:
    """The Pipeline CRM API as typed methods. One connection; one place for auth, retries and errors."""

    def __init__(self, api_key, *, base_url=BASE_URL, transport=None, max_attempts=4, max_wait=60.0,
                 sleep=time.sleep, rng=random, new_key=lambda: str(uuid.uuid4())):
        ...

    # close(), __enter__, __exit__ and __repr__

    def _request(self, method, url, *, idempotency_key=None, **kwargs):
        """Send one request, with retries, and return the response, or raise a CrmError."""
        ...

    def get_contact(self, contact_id):
        ...

    def iter_contacts(self, *, updated_since=None, page_size=100):
        ...

    def create_contact(self, name, email, *, company=None, tags=(), idempotency_key=None):
        ...

    def update_contact(self, contact_id, **changes):
        ...

    def iter_deals(self, *, stage=None, per_page=50):
        ...

    def create_deal(self, title, contact_id, amount, currency="GBP", *, idempotency_key=None):
        ...

    def move_deal(self, deal_id, stage):
        ...


# ---------------------------------------------------------------------------------------------
# Everything below here is the fake Pipeline CRM. Read it to see exactly how the API behaves,
# but don't change it: the sample run in the brief comes from this server.
# ---------------------------------------------------------------------------------------------

DEMO_KEY = "pcrm_live_7d2e9b41d8"
STAGES = ("lead", "qualified", "proposal", "won", "lost")
CLOSED_STAGES = ("won", "lost")

SAMPLE_CONTACTS = [
    # id, name, email, company, tags, last updated
    ("ct_001", "Ada Lovelace", "ada@kilncafe.example", "Kiln Cafe", ["wholesale"], "2026-09-01T10:00:00Z"),
    ("ct_002", "Grace Hopper", "grace@harbourroasters.example", "Harbour Roasters", ["wholesale", "vip"], "2026-09-03T15:30:00Z"),
    ("ct_003", "Linus Pauling", "linus@beanstalkdeli.example", "Beanstalk Deli", [], "2026-09-10T09:12:00Z"),
    ("ct_004", "Margaret Hamilton", "margaret@orbitbakery.example", "Orbit Bakery", ["wholesale"], "2026-09-14T11:45:00Z"),
    ("ct_005", "Alan Turing", "alan@bletchleybooks.example", "Bletchley Books", ["cafe"], "2026-09-18T16:20:00Z"),
    ("ct_006", "Katherine Johnson", "katherine@launchpad.example", "Launchpad Cowork", ["office"], "2026-09-22T08:05:00Z"),
    ("ct_007", "Tim Berners-Lee", "tim@webcafe.example", "Web Cafe", [], "2026-09-25T13:40:00Z"),
]

SAMPLE_DEALS = [
    # id, title, contact, amount, stage, created, closed
    ("dl_001", "Kiln Cafe: monthly espresso", "ct_001", "1200.00", "won", "2026-08-04T09:00:00Z", "2026-09-02T12:00:00Z"),
    ("dl_002", "Harbour Roasters: grinder lease", "ct_002", "3400.00", "proposal", "2026-08-11T09:00:00Z", None),
    ("dl_003", "Beanstalk Deli: starter pack", "ct_003", "450.00", "lead", "2026-09-10T09:15:00Z", None),
    ("dl_004", "Orbit Bakery: filter coffee", "ct_004", "2100.00", "qualified", "2026-09-14T11:50:00Z", None),
    ("dl_005", "Bletchley Books: decaf range", "ct_005", "800.00", "qualified", "2026-09-18T16:25:00Z", None),
    ("dl_006", "Launchpad Cowork: office subscription", "ct_006", "5200.00", "proposal", "2026-09-22T08:10:00Z", None),
    ("dl_007", "Web Cafe: cold brew trial", "ct_007", "600.00", "lost", "2026-09-25T13:45:00Z", "2026-09-27T10:00:00Z"),
    ("dl_008", "Kiln Cafe: second site", "ct_001", "2900.00", "lead", "2026-09-26T10:30:00Z", None),
    ("dl_009", "Harbour Roasters: training day", "ct_002", "750.00", "won", "2026-09-01T14:00:00Z", "2026-09-20T17:00:00Z"),
]

# Failures the server produces on purpose, each once: (method, path, page or cursor, failure)
CHAOS = [
    ("GET", "/v1/contacts", "c_3", 503),                   # the second page of contacts
    ("GET", "/v1/deals", "2", (429, "2")),                 # the second page of deals: rate limited
    ("POST", "/v1/contacts", None, "lost"),                # the first new contact: processed, answer lost
    ("GET", "/v1/contacts/ct_004", None, "timeout"),      # a contact that's slow to answer
]


def _iso(moment):
    return moment.strftime("%Y-%m-%dT%H:%M:%SZ")


def _error(status, code, message):
    return httpx.Response(status, json={"error": {"code": code, "message": message}})


class CrmServer:
    """A fake Pipeline CRM API for httpx.MockTransport. Keeps its data in memory, and every request."""

    def __init__(self, api_key=DEMO_KEY, *, chaos=True):
        self.api_key = api_key
        self.chaos = list(CHAOS) if chaos else []
        self.requests = []
        self.failures = 0
        self.clock = datetime(2026, 9, 29, 9, 0, tzinfo=timezone.utc)
        self.idempotent = {}
        self.contacts = {
            cid: {"id": cid, "name": name, "email": email, "company": company, "tags": list(tags),
                  "created_at": updated, "updated_at": updated}
            for cid, name, email, company, tags, updated in SAMPLE_CONTACTS
        }
        self.deals = {
            did: {"id": did, "title": title, "contact_id": contact, "amount": amount, "currency": "GBP",
                  "stage": stage, "created_at": created, "closed_at": closed}
            for did, title, contact, amount, stage, created, closed in SAMPLE_DEALS
        }

    def __call__(self, request):
        self.requests.append(request)
        request_id = f"req_{len(self.requests):04}"
        failure = self._chaos_for(request)
        if failure == "timeout":
            self.failures += 1
            raise httpx.ReadTimeout("the CRM didn't answer in time", request=request)
        if isinstance(failure, (int, tuple)):
            self.failures += 1
            status, retry_after = failure if isinstance(failure, tuple) else (failure, None)
            response = _error(status, "unavailable" if status != 429 else "rate_limited", "please try again")
            if retry_after:
                response.headers["Retry-After"] = retry_after
        elif request.headers.get("authorization") != f"Bearer {self.api_key}":
            response = _error(401, "unauthorized", "invalid API key")
        else:
            response = self._route(request)
            if failure == "lost":
                self.failures += 1
                raise httpx.ReadTimeout("the connection dropped before the answer arrived", request=request)
        response.headers["X-Request-Id"] = request_id
        return response

    def _chaos_for(self, request):
        marker = request.url.params.get("cursor") or request.url.params.get("page")
        for rule in self.chaos:
            method, path, where, failure = rule
            if (method, path, where) == (request.method, request.url.path, marker):
                self.chaos.remove(rule)
                return failure
        return None

    def _now(self):
        self.clock += timedelta(minutes=1)
        return _iso(self.clock)

    def _route(self, request):
        parts = request.url.path.removeprefix("/v1/").split("/")
        body = json.loads(request.content) if request.content else {}
        match request.method, parts:
            case "GET", ["contacts"]:
                return self._list_contacts(request.url.params)
            case "POST", ["contacts"]:
                return self._idempotent(request, lambda: self._create_contact(body))
            case "GET", ["contacts", cid]:
                return self._found(self.contacts, cid, "contact")
            case "PATCH", ["contacts", cid]:
                return self._update_contact(cid, body)
            case "GET", ["deals"]:
                return self._list_deals(request.url.params)
            case "POST", ["deals"]:
                return self._idempotent(request, lambda: self._create_deal(body))
            case "PATCH", ["deals", did]:
                return self._move_deal(did, body)
        return _error(404, "not_found", "no such endpoint")

    def _idempotent(self, request, create):
        key = request.headers.get("idempotency-key")
        if key is None:
            return _error(400, "idempotency_key_required", "send an Idempotency-Key header with every create")
        replayed = key in self.idempotent
        if not replayed:
            response = create()
            self.idempotent[key] = (response.status_code, response.json())
        status, body = self.idempotent[key]
        return httpx.Response(status, json=body, headers={"Idempotent-Replayed": "true"} if replayed else {})

    def _found(self, table, record_id, kind):
        if record_id not in table:
            return _error(404, "not_found", f"{kind} {record_id} not found")
        return httpx.Response(200, json=table[record_id])

    def _list_contacts(self, params):
        limit = int(params.get("limit", 50))
        if not 1 <= limit <= 100:
            return _error(400, "invalid_request", "limit must be from 1 to 100")
        contacts = sorted(self.contacts.values(), key=lambda c: c["id"])
        if "updated_since" in params:
            try:
                since = datetime.fromisoformat(params["updated_since"])
            except ValueError:
                return _error(400, "invalid_request", "updated_since must be an ISO 8601 datetime")
            if since.tzinfo is None:
                return _error(400, "invalid_request", "updated_since needs a timezone")
            contacts = [c for c in contacts if datetime.fromisoformat(c["updated_at"]) >= since]
        start = int(params.get("cursor", "c_0").removeprefix("c_"))
        end = start + limit
        next_cursor = f"c_{end}" if end < len(contacts) else None
        return httpx.Response(200, json={"data": contacts[start:end], "next_cursor": next_cursor})

    def _create_contact(self, body):
        name, email = str(body.get("name", "")).strip(), str(body.get("email", "")).strip()
        if not name:
            return _error(422, "invalid_request", "name is required")
        if "@" not in email:
            return _error(422, "invalid_request", f"{email!r} isn't an email address")
        if any(c["email"].lower() == email.lower() for c in self.contacts.values()):
            return _error(409, "duplicate_email", f"{email} is already a contact")
        now = self._now()
        contact = {"id": f"ct_{len(self.contacts) + 1:03}", "name": name, "email": email,
                   "company": body.get("company"), "tags": list(body.get("tags", [])),
                   "created_at": now, "updated_at": now}
        self.contacts[contact["id"]] = contact
        return httpx.Response(201, json=contact)

    def _update_contact(self, cid, body):
        if cid not in self.contacts:
            return _error(404, "not_found", f"contact {cid} not found")
        unknown = sorted(set(body) - {"name", "company", "tags"})
        if unknown:
            return _error(422, "invalid_request", f"can't change {', '.join(unknown)}")
        self.contacts[cid].update(body, updated_at=self._now())
        return httpx.Response(200, json=self.contacts[cid])

    def _list_deals(self, params):
        per_page = int(params.get("per_page", 30))
        page = int(params.get("page", 1))
        deals = sorted(self.deals.values(), key=lambda d: d["id"])
        if "stage" in params:
            deals = [d for d in deals if d["stage"] == params["stage"]]
        last = max(1, -(-len(deals) // per_page))
        chunk = deals[(page - 1) * per_page : page * per_page]
        query = {"per_page": per_page, **({"stage": params["stage"]} if "stage" in params else {})}
        links = []
        if page < last:
            links.append(f'<{httpx.URL(BASE_URL + "/deals", params={**query, "page": page + 1})}>; rel="next"')
        links.append(f'<{httpx.URL(BASE_URL + "/deals", params={**query, "page": last})}>; rel="last"')
        return httpx.Response(200, json=chunk, headers={"Link": ", ".join(links)})

    def _create_deal(self, body):
        if body.get("contact_id") not in self.contacts:
            return _error(422, "invalid_request", f"contact {body.get('contact_id')} does not exist")
        try:
            amount = Decimal(str(body.get("amount")))
        except ArithmeticError:
            return _error(422, "invalid_request", "amount must be a decimal string")
        if amount <= 0 or amount != amount.quantize(Decimal("0.01")):
            return _error(422, "invalid_request", "amount must be positive, to the penny")
        if body.get("currency") not in ("GBP", "EUR", "USD"):
            return _error(422, "invalid_request", "currency must be GBP, EUR or USD")
        deal = {"id": f"dl_{len(self.deals) + 1:03}", "title": body.get("title", ""),
                "contact_id": body["contact_id"], "amount": f"{amount:.2f}", "currency": body["currency"],
                "stage": "lead", "created_at": self._now(), "closed_at": None}
        self.deals[deal["id"]] = deal
        return httpx.Response(201, json=deal)

    def _move_deal(self, did, body):
        if did not in self.deals:
            return _error(404, "not_found", f"deal {did} not found")
        deal, stage = self.deals[did], body.get("stage")
        if stage not in STAGES:
            return _error(422, "invalid_request", f"{stage!r} isn't a stage")
        if deal["stage"] in CLOSED_STAGES:
            return _error(422, "invalid_request", f"a {deal['stage']} deal can't move to {stage}")
        deal["stage"] = stage
        if stage in CLOSED_STAGES:
            deal["closed_at"] = self._now()
        return httpx.Response(200, json=deal)


# ---------------------------------------------------------------------------------------------
# The demo: what the wholesale team runs every Monday morning
# ---------------------------------------------------------------------------------------------

NEW_LEADS = [
    {"name": "Hedy Lamarr", "email": "hedy@signalcafe.example", "company": "Signal Cafe", "tags": ["cafe"]},
    {"name": "Grace Hopper", "email": "GRACE@harbourroasters.example", "company": "Harbour Roasters"},
    {"name": "Rosalind Franklin", "email": "rosalind at helixbakes", "company": "Helix Bakes"},
    {"name": "Claude Shannon", "email": "claude@bitsandbeans.example", "company": "Bits and Beans"},
]


def print_pipeline(deals):
    print("Open pipeline")
    for stage in ("lead", "qualified", "proposal"):
        in_stage = [deal for deal in deals if deal.stage == stage]
        total = f"£{sum((deal.amount for deal in in_stage), Decimal('0')):,.2f}"
        print(f"  {stage:<10} {len(in_stage):>2}  {total:>10}")
    won = [deal for deal in deals if deal.stage == "won"]
    print(f"  Won: {len(won)} deals, £{sum((deal.amount for deal in won), Decimal('0')):,.2f}")


def main():
    logging.basicConfig(level=logging.WARNING, format="  (log) %(levelname)s %(name)s: %(message)s", stream=sys.stdout)
    server = CrmServer()
    waits = []
    with CrmClient(DEMO_KEY, transport=httpx.MockTransport(server), sleep=waits.append) as crm:
        print(repr(crm))
        print()

        contacts = list(crm.iter_contacts(page_size=3))
        print(f"{len(contacts)} contacts")
        for contact in contacts:
            print(f"  {contact.id}  {contact.name:<18} {contact.company or '-'}")
        print()

        print_pipeline(list(crm.iter_deals(per_page=4)))
        print()

        print("Importing leads")
        for lead in NEW_LEADS:
            try:
                contact = crm.create_contact(**lead)
            except (ConflictError, BadRequestError) as error:
                print(f"  skipped {lead['email']}: {error}")
                continue
            deal = crm.create_deal(f"{contact.company}: first order", contact.id, Decimal("350.00"))
            print(f"  added {contact.id} {contact.name}, with {deal.id} for £{deal.amount}")
        print()

        won = crm.move_deal("dl_004", "won")
        print(f"{won.id} {won.title!r} is {won.stage}, closed {won.closed_at:%d %b %Y at %H:%M}")
        updated = crm.update_contact("ct_004", tags=["wholesale", "vip"])
        print(f"{updated.id} is now tagged {', '.join(updated.tags)}")
        print(f"{crm.get_contact('ct_004').name} checked again after a slow answer")
        for attempt in (lambda: crm.move_deal("dl_007", "won"), lambda: crm.get_contact("ct_999")):
            try:
                attempt()
            except CrmApiError as error:
                print(f"Refused: {error} ({type(error).__name__}, {error.request_id})")
        print()

        changed = list(crm.iter_contacts(updated_since=datetime(2026, 9, 29, tzinfo=timezone.utc)))
        print(f"Changed today: {', '.join(contact.id for contact in changed)}")

    print(f"The server saw {len(server.requests)} requests, {server.failures} of them failed on purpose;")
    print(f"the client waited {len(waits)} times, and created {len(server.contacts) - 7} contacts, not one more.")


if __name__ == "__main__":
    main()
