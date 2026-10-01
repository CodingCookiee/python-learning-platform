"""Acceptance tests for the webhook-ready service, run by GitHub Actions in your repository.

They import service.py from the top of your repository, build a fresh app with create_app
for every test (with the clock pinned through app.dependency_overrides[get_now]), and send
it requests in-process over httpx.ASGITransport. They also run your own test_service.py.
"""

import asyncio
import importlib
import json
import re
import subprocess
import sys
import xml.etree.ElementTree as ET
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pytest

PROGRAM = Path("service.py")
NOW = datetime(2026, 10, 1, 12, 0, tzinfo=UTC)
STAMP = int(NOW.timestamp())
SECRET = "whsec_acceptance_51c2"
KEY = {"X-API-Key": "tw_test_desk"}
BOOKING = {"customer_email": "ada@example.com", "tour": "harbour-kayak", "tour_date": "2026-10-10", "party_size": 2}

SAMPLE_RUN = """\
POST /bookings                     201 {"id": 1, "customer_email": "ada@example.com", "tour": "harbour-kayak", "tour_date": "2026-10-10", "party_size": 2, "amount_cents": 9000, "status": "pending"}
POST /bookings (no key)            401 {"error": {"code": "unauthorized", "message": "Missing or invalid API key"}}
PATCH /bookings/1                  200 {"id": 1, "customer_email": "ada@example.com", "tour": "harbour-kayak", "tour_date": "2026-10-10", "party_size": 3, "amount_cents": 13500, "status": "pending"}
POST /webhooks/paygate             200 {"status": "processed"}
POST /webhooks/paygate (again)     200 {"status": "duplicate"}
POST /webhooks/paygate (forged)    400 {"error": {"code": "invalid_signature", "message": "Signature doesn't match"}}
GET /bookings/1                    200 {"id": 1, "customer_email": "ada@example.com", "tour": "harbour-kayak", "tour_date": "2026-10-10", "party_size": 3, "amount_cents": 13500, "status": "paid"}
DELETE /bookings/1                 409 {"error": {"code": "conflict", "message": "Booking 1 is paid; refund it through Paygate first"}}"""


class AppClient:
    """A small synchronous client that sends requests to an app in-process, over ASGITransport."""

    def __init__(self, app):
        self.app = app

    def __enter__(self):
        self.runner = asyncio.Runner()
        self.client = httpx.AsyncClient(transport=httpx.ASGITransport(app=self.app), base_url="http://test")
        return self

    def __exit__(self, *exc_info):
        self.runner.run(self.client.aclose())
        self.runner.close()

    def request(self, method, url, **options):
        return self.runner.run(self.client.request(method, url, **options))

    def get(self, url, **options):
        return self.request("GET", url, **options)

    def post(self, url, **options):
        return self.request("POST", url, **options)

    def put(self, url, **options):
        return self.request("PUT", url, **options)

    def patch(self, url, **options):
        return self.request("PATCH", url, **options)

    def delete(self, url, **options):
        return self.request("DELETE", url, **options)


@pytest.fixture(scope="module")
def service():
    assert PROGRAM.exists(), "service.py should be at the top of your repository"
    return importlib.import_module("service")


def make_app(service, **settings):
    app = service.create_app(
        service.Settings(api_keys=["tw_test_desk", "tw_test_hotel"], webhook_secret=SECRET, **settings)
    )
    app.dependency_overrides[service.get_now] = lambda: NOW
    return app


@pytest.fixture
def client(service):
    with AppClient(make_app(service)) as client:
        yield client


def book(client, **changes):
    response = client.post("/bookings", json={**BOOKING, **changes}, headers=KEY)
    assert response.status_code == 201, f"Creating a booking failed: {response.status_code} {response.text}"
    return response.json()


def status_of(client, booking_id=1):
    return client.get(f"/bookings/{booking_id}", headers=KEY).json()["status"]


def event(event_id="evt_1", kind="payment.succeeded", booking_id=1, amount_cents=9000):
    return {"id": event_id, "type": kind, "created": STAMP, "data": {"booking_id": booking_id, "amount_cents": amount_cents}}


def deliver(service, client, payload, *, secret=SECRET, timestamp=STAMP, body=None, header=None):
    """POST an event to the webhook, signed as Paygate would sign it, unless told otherwise."""
    raw = json.dumps(payload).encode()
    signature = service.sign_webhook(raw, secret, timestamp) if header is None else header
    headers = {"Content-Type": "application/json"}
    if signature != "":
        headers["Paygate-Signature"] = signature
    return client.post("/webhooks/paygate", content=raw if body is None else body, headers=headers)


def error_code(response):
    try:
        return response.json()["error"]["code"]
    except (ValueError, KeyError, TypeError):
        raise AssertionError(f"Expected the error shape {{'error': {{'code', 'message'}}}}, got {response.text}") from None


def test_the_demo_prints_the_sample_run():
    assert PROGRAM.exists(), "service.py should be at the top of your repository"
    result = subprocess.run([sys.executable, str(PROGRAM)], capture_output=True, text=True, timeout=60)
    assert result.returncode == 0, f"python service.py crashed:\n{result.stderr[-1500:]}"
    assert [line.rstrip() for line in result.stdout.strip().splitlines()] == SAMPLE_RUN.splitlines()


def test_creating_a_booking_sets_price_id_and_status_on_the_server(client):
    assert book(client) == {**BOOKING, "id": 1, "amount_cents": 9000, "status": "pending"}
    assert book(client, tour="lighthouse-walk", party_size=3)["amount_cents"] == 4500
    for extra in ({"amount_cents": 1}, {"status": "paid"}, {"id": 7}):
        response = client.post("/bookings", json={**BOOKING, **extra}, headers=KEY)
        assert response.status_code == 422, f"Sending {extra} should be refused with 422"
    response = client.post("/bookings", json={**BOOKING, "customer_email": "ada.example.com", "party_size": 13}, headers=KEY)
    assert response.status_code == 422
    problem = response.json()["error"]
    assert problem["code"] == "validation_failed" and problem["message"] == "The request is invalid"
    assert isinstance(problem["fields"], list) and len(problem["fields"]) == 2, "Expected one entry in fields per problem"


def test_every_bookings_route_needs_an_api_key(client):
    book(client)
    for method, path in [("post", "/bookings"), ("get", "/bookings"), ("get", "/bookings/1"),
                         ("patch", "/bookings/1"), ("delete", "/bookings/1")]:
        for headers in ({}, {"X-API-Key": "tw_test_wrong"}):
            response = client.request(method.upper(), path, headers=headers, json=BOOKING if method != "delete" else None)
            assert response.status_code == 401, f"{method.upper()} {path} with {headers or 'no key'} should be 401"
            assert response.headers.get("WWW-Authenticate") == "ApiKey"
            assert response.json() == {"error": {"code": "unauthorized", "message": "Missing or invalid API key"}}
    assert client.get("/bookings", headers={"X-API-Key": "tw_test_hotel"}).status_code == 200, "Every key in api_keys should work"
    health = client.get("/health")
    assert health.status_code == 200 and health.json() == {"status": "ok"}, "GET /health needs no key"


def test_missing_bookings_and_wrong_methods_have_the_error_shape(client):
    response = client.get("/bookings/99", headers=KEY)
    assert response.status_code == 404
    assert response.json() == {"error": {"code": "not_found", "message": "Booking 99 not found"}}
    assert client.patch("/bookings/99", json={"party_size": 3}, headers=KEY).status_code == 404
    assert client.delete("/bookings/99", headers=KEY).status_code == 404
    book(client)
    wrong = client.put("/bookings/1", json=BOOKING, headers=KEY)
    assert wrong.status_code == 405 and error_code(wrong) == "method_not_allowed"


def test_patch_changes_only_what_was_sent_and_recalculates_the_amount(client):
    book(client)
    response = client.patch("/bookings/1", json={"party_size": 3}, headers=KEY)
    assert response.status_code == 200
    assert response.json() == {**BOOKING, "id": 1, "party_size": 3, "amount_cents": 13500, "status": "pending"}
    moved = client.patch("/bookings/1", json={"tour_date": "2026-10-11"}, headers=KEY).json()
    assert moved["tour_date"] == "2026-10-11" and moved["party_size"] == 3
    assert client.patch("/bookings/1", json={"tour": "island-ferry"}, headers=KEY).status_code == 422
    client.delete("/bookings/1", headers=KEY)
    refused = client.patch("/bookings/1", json={"party_size": 4}, headers=KEY)
    assert refused.status_code == 409
    assert refused.json() == {"error": {"code": "conflict", "message": "Booking 1 is cancelled and can't be changed"}}


def test_cancelling_and_the_paid_booking_rules(service, client):
    book(client)
    book(client)
    response = client.delete("/bookings/2", headers=KEY)
    assert response.status_code == 204 and status_of(client, 2) == "cancelled"
    assert deliver(service, client, event()).json() == {"status": "processed"}
    patch = client.patch("/bookings/1", json={"party_size": 3}, headers=KEY)
    assert patch.status_code == 409
    assert patch.json()["error"]["message"] == "Booking 1 is paid and can't be changed"
    delete = client.delete("/bookings/1", headers=KEY)
    assert delete.status_code == 409
    assert delete.json()["error"]["message"] == "Booking 1 is paid; refund it through Paygate first"
    assert status_of(client) == "paid"


def test_listing_filters_by_status_and_pages(client):
    for size in range(1, 6):
        book(client, party_size=size)
    client.delete("/bookings/2", headers=KEY)
    ids = lambda response: [b["id"] for b in response.json()]  # noqa: E731
    assert ids(client.get("/bookings", headers=KEY)) == [1, 2, 3, 4, 5]
    assert ids(client.get("/bookings", params={"status": "pending"}, headers=KEY)) == [1, 3, 4, 5]
    assert ids(client.get("/bookings", params={"status": "cancelled"}, headers=KEY)) == [2]
    assert ids(client.get("/bookings", params={"offset": 1, "limit": 2}, headers=KEY)) == [2, 3]
    assert ids(client.get("/bookings", params={"status": "pending", "offset": 3}, headers=KEY)) == [5]
    for params in ({"limit": 0}, {"limit": 101}, {"offset": -1}):
        assert client.get("/bookings", params=params, headers=KEY).status_code == 422, f"{params} should be refused"


def test_a_valid_payment_marks_the_booking_paid_once(service, client):
    book(client)
    assert deliver(service, client, event()).json() == {"status": "processed"}
    assert status_of(client) == "paid"
    assert deliver(service, client, event()).json() == {"status": "duplicate"}
    assert deliver(service, client, event("evt_2", "payment.refunded")).json() == {"status": "processed"}
    assert status_of(client) == "refunded"
    again = deliver(service, client, event())
    assert again.status_code == 200 and again.json() == {"status": "duplicate"}
    assert status_of(client) == "refunded", "A repeated event must not be applied again, even after a later event"


def test_bad_signatures_are_refused_and_change_nothing(service, client):
    book(client)
    raw = json.dumps(event()).encode()
    good = service.sign_webhook(raw, SECRET, STAMP)
    attempts = {
        "forged": (deliver(service, client, event(), secret="whsec_wrong"), "invalid_signature"),
        "tampered": (deliver(service, client, event(), body=raw.replace(b"9000", b"9001")), "invalid_signature"),
        "missing": (deliver(service, client, event(), header=""), "invalid_signature"),
        "uppercase hex": (deliver(service, client, event(), header=good.upper().replace("T=", "t=").replace("V1=", "v1=")), "invalid_signature"),
        "no timestamp": (deliver(service, client, event(), header=good.split(",")[1]), "invalid_signature"),
        "old": (deliver(service, client, event(), timestamp=STAMP - 301), "stale_signature"),
        "future": (deliver(service, client, event(), timestamp=STAMP + 301), "stale_signature"),
    }
    for name, (response, code) in attempts.items():
        assert response.status_code == 400, f"The {name} signature should be refused with 400, got {response.status_code}"
        assert error_code(response) == code, f"The {name} signature should be {code}"
    assert status_of(client) == "pending", "A refused webhook must change nothing"
    late = deliver(service, client, event(), timestamp=STAMP - 299)
    assert late.json() == {"status": "processed"}, (
        "A signature 299 seconds old is inside the tolerance, and a refused attempt must not mark the event as seen"
    )


def test_the_tolerance_comes_from_the_settings(service):
    with AppClient(make_app(service, signature_tolerance_seconds=60)) as client:
        book(client)
        assert error_code(deliver(service, client, event(), timestamp=STAMP - 61)) == "stale_signature"
        assert deliver(service, client, event(), timestamp=STAMP + 59).json() == {"status": "processed"}


def test_mismatched_unknown_and_invalid_events(service, client):
    book(client)
    book(client)
    book(client)
    assert deliver(service, client, event("evt_a", amount_cents=100)).json() == {"status": "needs_review"}
    assert status_of(client, 1) == "needs_review"
    client.delete("/bookings/2", headers=KEY)
    assert deliver(service, client, event("evt_b", booking_id=2)).json() == {"status": "needs_review"}, (
        "A payment for a booking that isn't pending should flag it"
    )
    assert deliver(service, client, event("evt_c", kind="charge.disputed", booking_id=3)).json() == {"status": "ignored"}
    assert deliver(service, client, event("evt_d", booking_id=999)).json() == {"status": "ignored"}
    assert status_of(client, 3) == "pending"
    assert deliver(service, client, event("evt_c", booking_id=3)).json() == {"status": "duplicate"}, (
        "Every verified event's id is recorded, even an ignored one"
    )
    not_an_event = deliver(service, client, {"type": "payment.succeeded", "data": {}})
    assert not_an_event.status_code == 400, "A signed body that isn't a valid event should be a 400"


def test_every_response_has_a_request_id(client):
    generated = client.get("/health").headers.get("X-Request-ID", "")
    assert re.fullmatch(r"[0-9a-f]{32}", generated), f"Expected a uuid4().hex request id, got {generated!r}"
    assert client.get("/health", headers={"X-Request-ID": "trace-1234-abcd"}).headers["X-Request-ID"] == "trace-1234-abcd"
    replaced = client.get("/health", headers={"X-Request-ID": "bad id!"}).headers["X-Request-ID"]
    assert re.fullmatch(r"[0-9a-f]{32}", replaced), "An invalid incoming id should be replaced"
    assert re.fullmatch(r"[0-9a-f]{32}", client.get("/bookings/1").headers.get("X-Request-ID", "")), "Errors need one too"


def test_two_apps_share_nothing(service):
    with AppClient(make_app(service)) as first, AppClient(make_app(service)) as second:
        book(first)
        assert deliver(service, first, event()).json() == {"status": "processed"}
        assert second.get("/bookings/1", headers=KEY).status_code == 404
        book(second)
        assert deliver(service, second, event()).json() == {"status": "processed"}, "Processed events must not be shared"


def test_your_own_test_suite_passes_with_at_least_15_tests(tmp_path):
    suite = Path("test_service.py")
    assert suite.exists(), "test_service.py should be at the top of your repository"
    report = tmp_path / "report.xml"
    result = subprocess.run(
        [sys.executable, "-m", "pytest", str(suite), "-q", "-p", "no:cacheprovider", f"--junitxml={report}"],
        capture_output=True, text=True, timeout=120,
    )
    assert report.exists(), f"Your tests didn't run:\n{result.stdout[-1500:]}{result.stderr[-1500:]}"
    root = ET.parse(report).getroot()
    cases = list(root.iter("testcase"))
    failed = [c.get("name") for c in cases if c.find("failure") is not None or c.find("error") is not None]
    assert not failed, f"These tests in test_service.py fail: {failed[:5]}\n{result.stdout[-1500:]}"
    passed = [c for c in cases if c.find("skipped") is None]
    assert len(passed) >= 15, f"test_service.py should have at least 15 passing tests, has {len(passed)}"
