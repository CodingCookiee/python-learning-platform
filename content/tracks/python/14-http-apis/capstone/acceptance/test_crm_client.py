"""Acceptance tests for the CRM client library, run by GitHub Actions in your repository.

They import crm_client.py from the top of your repository and point your CrmClient at a
fresh copy of the original fake Pipeline CRM (below, unchanged from the starter), or at
small handlers that fail in particular ways, through httpx.MockTransport. Nothing touches
the network, and nothing really sleeps: every client gets sleep=waits.append.
"""

import importlib
import json
import logging
import os
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

import httpx
import pytest

BASE_URL = "https://api.pipelinecrm.example/v1"

# ---------------------------------------------------------------------------
# The original fake Pipeline CRM, exactly as in the starter
# ---------------------------------------------------------------------------

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


# ---------------------------------------------------------------------------
# The tests
# ---------------------------------------------------------------------------

PROGRAM = Path("crm_client.py")

SAMPLE_RUN = """\
CrmClient(base_url='https://api.pipelinecrm.example/v1', api_key='...41d8')

  (log) WARNING crm_client: GET /v1/contacts: HTTP 503, retry 1 of 3
7 contacts
  ct_001  Ada Lovelace       Kiln Cafe
  ct_002  Grace Hopper       Harbour Roasters
  ct_003  Linus Pauling      Beanstalk Deli
  ct_004  Margaret Hamilton  Orbit Bakery
  ct_005  Alan Turing        Bletchley Books
  ct_006  Katherine Johnson  Launchpad Cowork
  ct_007  Tim Berners-Lee    Web Cafe

  (log) WARNING crm_client: GET /v1/deals: HTTP 429, retry 1 of 3
Open pipeline
  lead        2   £3,350.00
  qualified   2   £2,900.00
  proposal    2   £8,600.00
  Won: 2 deals, £1,950.00

Importing leads
  (log) WARNING crm_client: POST /v1/contacts: ReadTimeout, retry 1 of 3
  added ct_008 Hedy Lamarr, with dl_010 for £350.00
  skipped GRACE@harbourroasters.example: HTTP 409: GRACE@harbourroasters.example is already a contact
  skipped rosalind at helixbakes: HTTP 422: 'rosalind at helixbakes' isn't an email address
  added ct_009 Claude Shannon, with dl_011 for £350.00

dl_004 'Orbit Bakery: filter coffee' is won, closed 29 Sep 2026 at 09:05
ct_004 is now tagged wholesale, vip
  (log) WARNING crm_client: GET /v1/contacts/ct_004: ReadTimeout, retry 1 of 3
Margaret Hamilton checked again after a slow answer
Refused: HTTP 422: a lost deal can't move to won (BadRequestError, req_0020)
Refused: HTTP 404: contact ct_999 not found (NotFoundError, req_0021)

Changed today: ct_004, ct_008, ct_009
The server saw 22 requests, 4 of them failed on purpose;
the client waited 4 times, and created 2 contacts, not one more.
"""


class EdgeRng:
    """A random-module stand-in whose jitter is always the largest allowed."""

    def uniform(self, low, high):
        return high


class Always:
    """A MockTransport handler that gives the same answer to every request, and keeps them."""

    def __init__(self, status=200, *, headers=None, body=None, raises=None):
        self.status, self.headers, self.body, self.raises = status, headers or {}, body, raises
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        if self.raises:
            raise self.raises("no answer", request=request)
        if self.body is not None:
            return httpx.Response(self.status, text=self.body, headers={"Content-Type": "text/html", **self.headers})
        return httpx.Response(self.status, json={"error": {"code": "x", "message": "try later"}}, headers=self.headers)


@pytest.fixture(scope="module")
def crm():
    assert PROGRAM.exists(), "crm_client.py should be at the top of your repository"
    return importlib.import_module("crm_client")


def make(crm, handler, key=DEMO_KEY, **options):
    """A client on a MockTransport, with its waits collected instead of slept."""
    waits = []
    options.setdefault("sleep", waits.append)
    client = crm.CrmClient(key, transport=httpx.MockTransport(handler), **options)
    return client, waits


def raised(kind, action):
    with pytest.raises(kind) as caught:
        action()
    return caught.value


def test_running_it_prints_the_sample_run():
    assert PROGRAM.exists(), "crm_client.py should be at the top of your repository"
    result = subprocess.run(
        [sys.executable, str(PROGRAM)], capture_output=True, encoding="utf-8", timeout=60,
        env={**os.environ, "PYTHONIOENCODING": "utf-8"},
    )
    assert result.returncode == 0, f"python crm_client.py crashed:\n{result.stderr[-1500:]}"
    assert [line.rstrip() for line in result.stdout.splitlines()] == SAMPLE_RUN.splitlines()


def test_repr_never_shows_the_key(crm):
    client, _ = make(crm, CrmServer())
    assert repr(client) == "CrmClient(base_url='https://api.pipelinecrm.example/v1', api_key='...41d8')"
    short, _ = make(crm, CrmServer(), key="abc12345")
    assert repr(short) == "CrmClient(base_url='https://api.pipelinecrm.example/v1', api_key='***')"


def test_requests_carry_the_bearer_token_and_user_agent(crm):
    server = CrmServer(chaos=False)
    client, _ = make(crm, server)
    contact = client.get_contact("ct_002")
    assert isinstance(contact, crm.Contact) and contact.name == "Grace Hopper" and contact.tags == ["wholesale", "vip"]
    assert isinstance(contact.created_at, datetime) and contact.created_at.tzinfo is not None
    request = server.requests[0]
    assert (request.method, request.url.path) == ("GET", "/v1/contacts/ct_002")
    assert request.headers["authorization"] == f"Bearer {DEMO_KEY}"
    assert request.headers["user-agent"] == "millstone-wholesale/1.0"
    assert DEMO_KEY not in str(request.url), "The key belongs in the Authorization header, never the URL"


def test_errors_become_the_clients_own_exceptions(crm):
    assert issubclass(crm.CrmApiError, crm.CrmError) and issubclass(crm.CrmConnectionError, crm.CrmError)
    for name in ("BadRequestError", "AuthenticationError", "NotFoundError", "ConflictError", "RateLimitError", "ServerError"):
        assert issubclass(getattr(crm, name), crm.CrmApiError), f"{name} should be a CrmApiError"
    server = CrmServer(chaos=False)
    client, _ = make(crm, server)
    missing = raised(crm.NotFoundError, lambda: client.get_contact("ct_999"))
    assert str(missing) == "HTTP 404: contact ct_999 not found"
    assert (missing.message, missing.status_code, missing.code, missing.request_id) == (
        "contact ct_999 not found", 404, "not_found", "req_0001"
    )
    duplicate = raised(crm.ConflictError, lambda: client.create_contact("Ada", "ADA@kilncafe.example"))
    assert duplicate.status_code == 409 and duplicate.code == "duplicate_email"
    invalid = raised(crm.BadRequestError, lambda: client.move_deal("dl_007", "won"))
    assert str(invalid) == "HTTP 422: a lost deal can't move to won"

    html, _ = make(crm, Always(400, body="<html><h1>Bad gateway config</h1></html>"))
    proxy = raised(crm.BadRequestError, lambda: html.get_contact("ct_001"))
    assert (proxy.message, proxy.code) == ("Bad Request", None), (
        "An error body that isn't the API's JSON should give the reason phrase as the message and no code"
    )
    teapot, _ = make(crm, Always(418))
    odd = raised(crm.CrmApiError, lambda: teapot.get_contact("ct_001"))
    assert type(odd) is crm.CrmApiError and odd.status_code == 418


def test_a_wrong_key_fails_once_without_showing_the_key(crm):
    server = CrmServer(api_key="pcrm_live_somethingelse", chaos=False)
    client, waits = make(crm, server)
    error = raised(crm.AuthenticationError, lambda: client.get_contact("ct_001"))
    assert len(server.requests) == 1 and waits == [], "A 401 should not be retried"
    assert error.status_code == 401 and error.code == "unauthorized"
    assert DEMO_KEY not in str(error) and DEMO_KEY not in repr(error)


def test_server_errors_are_retried_with_full_jitter_backoff(crm):
    handler = Always(503)
    client, waits = make(crm, handler, rng=EdgeRng())
    error = raised(crm.ServerError, lambda: client.get_contact("ct_001"))
    assert error.status_code == 503
    assert len(handler.requests) == 4, f"A GET should be sent 4 times in all, was sent {len(handler.requests)}"
    assert waits == [0.5, 1.0, 2.0], (
        f"Expected waits of rng.uniform(0, min(30, 0.5 * 2 ** attempt)) for attempts 0, 1, 2, got {waits}"
    )
    patch = Always(503)
    client, waits = make(crm, patch)
    raised(crm.ServerError, lambda: client.update_contact("ct_001", company="X"))
    assert len(patch.requests) == 1 and waits == [], "A PATCH has no idempotency key, so it must be sent once"
    fewer = Always(502)
    client, waits = make(crm, fewer, max_attempts=2, rng=EdgeRng())
    raised(crm.ServerError, lambda: client.get_contact("ct_001"))
    assert len(fewer.requests) == 2 and waits == [0.5]


def test_retry_after_is_respected_up_to_max_wait(crm):
    long = Always(429, headers={"Retry-After": "3600"})
    client, waits = make(crm, long)
    error = raised(crm.RateLimitError, lambda: client.get_contact("ct_001"))
    assert error.retry_after == 3600.0 and len(long.requests) == 1 and waits == [], (
        "A Retry-After longer than max_wait should raise RateLimitError straight away"
    )
    answers = iter([httpx.Response(429, json={"error": {"code": "rate_limited", "message": "slow down"}}, headers={"Retry-After": "2"})])
    server = CrmServer(chaos=False)

    def handler(request):
        answer = next(answers, None)
        return server(request) if answer is None else answer

    client, waits = make(crm, handler)
    assert client.get_contact("ct_001").id == "ct_001"
    assert waits == [2.0], f"A 429 with Retry-After: 2 should wait exactly 2 seconds, waited {waits}"


def test_no_response_becomes_a_connection_error(crm):
    handler = Always(raises=httpx.ConnectError)
    client, waits = make(crm, handler)
    error = raised(crm.CrmConnectionError, lambda: client.get_contact("ct_001"))
    assert str(error) == "GET /v1/contacts/ct_001: no response"
    assert isinstance(error.__cause__, httpx.TransportError), "Raise it from the httpx exception"
    assert len(handler.requests) == 4 and len(waits) == 3


def test_each_retry_logs_one_warning(crm, caplog):
    answers = iter([
        httpx.Response(503, json={"error": {"code": "unavailable", "message": "later"}}),
        "timeout",
    ])
    server = CrmServer(chaos=False)

    def handler(request):
        answer = next(answers, None)
        if answer is None:
            return server(request)
        if answer == "timeout":
            raise httpx.ReadTimeout("slow", request=request)
        return answer

    client, waits = make(crm, handler)
    with caplog.at_level(logging.WARNING, logger="crm_client"):
        client.get_contact("ct_004")
    warnings = [(r.name, r.levelname, r.getMessage()) for r in caplog.records if r.levelno >= logging.WARNING]
    assert warnings == [
        ("crm_client", "WARNING", "GET /v1/contacts/ct_004: HTTP 503, retry 1 of 3"),
        ("crm_client", "WARNING", "GET /v1/contacts/ct_004: ReadTimeout, retry 2 of 3"),
    ]


def test_creates_send_one_idempotency_key_and_never_duplicate(crm):
    server = CrmServer()  # its first POST /contacts is processed, then the answer is lost
    keys = iter(["key-1", "key-2", "key-3"])
    client, waits = make(crm, server, new_key=lambda: next(keys))
    contact = client.create_contact("Hedy Lamarr", "hedy@signalcafe.example", company="Signal Cafe", tags=("cafe",))
    assert contact.id == "ct_008" and contact.tags == ["cafe"]
    posts = [r for r in server.requests if r.method == "POST"]
    assert [r.headers.get("idempotency-key") for r in posts] == ["key-1", "key-1"], (
        "A retried create must send the same Idempotency-Key, from one new_key() call"
    )
    assert len(server.contacts) == 8, "The lost answer must not create a second contact"
    again = client.create_contact("Ada Two", "ada2@example.com", idempotency_key="lead-42")
    same = client.create_contact("Ada Two", "ada2@example.com", idempotency_key="lead-42")
    assert again == same and len(server.contacts) == 9
    deal = client.create_deal("Signal Cafe: first order", "ct_008", Decimal("350"))
    assert isinstance(deal, crm.Deal) and deal.amount == Decimal("350.00") and deal.stage == "lead"
    sent = json.loads(server.requests[-1].content)
    assert sent["amount"] == "350.00", "The amount should be sent as a string to two places"
    assert server.requests[-1].headers.get("idempotency-key", "").startswith("key-"), "create_deal needs an Idempotency-Key too"


def test_create_deal_insists_on_decimal_amounts(crm):
    server = CrmServer(chaos=False)
    client, _ = make(crm, server)
    with pytest.raises(TypeError):
        client.create_deal("Trial", "ct_001", 350.0)
    assert server.requests == [], "The TypeError should come before any request"
    moved = client.move_deal("dl_004", "won")
    assert moved.stage == "won" and isinstance(moved.closed_at, datetime)
    assert json.loads(server.requests[-1].content) == {"stage": "won"} and server.requests[-1].method == "PATCH"
    updated = client.update_contact("ct_004", tags=["wholesale", "vip"])
    assert updated.tags == ["wholesale", "vip"] and json.loads(server.requests[-1].content) == {"tags": ["wholesale", "vip"]}


def test_contacts_are_paged_lazily_by_cursor(crm):
    server = CrmServer(chaos=False)
    client, _ = make(crm, server)
    first = next(client.iter_contacts(page_size=2))
    assert first.id == "ct_001" and len(server.requests) == 1, "The iterator should fetch one page at a time"
    server.requests.clear()
    contacts = list(client.iter_contacts(page_size=3))
    assert [c.id for c in contacts] == [f"ct_00{n}" for n in range(1, 8)]
    assert [(r.url.params.get("limit"), r.url.params.get("cursor")) for r in server.requests] == [
        ("3", None), ("3", "c_3"), ("3", "c_6")
    ]
    server.requests.clear()
    since = list(client.iter_contacts(updated_since=datetime(2026, 9, 20, tzinfo=timezone.utc)))
    assert [c.id for c in since] == ["ct_006", "ct_007"]
    assert datetime.fromisoformat(server.requests[0].url.params["updated_since"]) == datetime(2026, 9, 20, tzinfo=timezone.utc)
    server.requests.clear()
    with pytest.raises(ValueError):
        next(client.iter_contacts(updated_since=datetime(2026, 9, 29)))
    assert server.requests == [], "A naive updated_since should be refused before any request"


def test_deals_follow_the_link_header(crm):
    server = CrmServer(chaos=False)
    client, _ = make(crm, server)
    leads = list(client.iter_deals(stage="lead", per_page=1))
    assert [d.id for d in leads] == ["dl_003", "dl_008"] and all(isinstance(d.amount, Decimal) for d in leads)
    assert len(server.requests) == 2
    first, second = server.requests
    assert first.url.params.get("stage") == "lead" and first.url.params.get("per_page") == "1"
    assert str(second.url) == str(httpx.URL(BASE_URL + "/deals", params={"per_page": 1, "stage": "lead", "page": 2})), (
        "The second request should go to the first page's next link, exactly as given"
    )
    server.requests.clear()
    assert len(list(client.iter_deals(per_page=4))) == 9 and len(server.requests) == 3, "The last page must not be dropped"


def test_the_key_never_reaches_the_logs(crm, caplog):
    server = CrmServer()
    client, _ = make(crm, server)
    with caplog.at_level(logging.DEBUG):
        list(client.iter_contacts(page_size=3))
        list(client.iter_deals(per_page=4))
        client.create_contact("Hedy Lamarr", "hedy@signalcafe.example")
        client.get_contact("ct_004")
        with pytest.raises(crm.CrmError):
            client.get_contact("ct_999")
    assert caplog.records, "Expected some log records, such as the retry warnings"
    leaked = [r.getMessage() for r in caplog.records if DEMO_KEY in r.getMessage() or DEMO_KEY[-12:] in r.getMessage()]
    assert leaked == [], f"The API key appeared in the logs: {leaked[:2]}"
