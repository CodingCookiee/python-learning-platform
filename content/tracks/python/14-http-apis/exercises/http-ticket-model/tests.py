from datetime import datetime, timezone

import httpx
from pydantic import ValidationError

from plp import hidden, raises, test
from solution import Ticket, parse_ticket

FULL = {
    "id": 4411,
    "subject": "Refund not received",
    "status": "open",
    "priority": "high",
    "created_at": "2026-09-28T14:03:00Z",
    "assignee": "grace",
    "tags": ["billing"],
    "sla_policy": "gold",
}


def response(body):
    return httpx.Response(200, json=body)


@test("Parses a full ticket")
def _():
    ticket = parse_ticket(response(FULL))
    assert isinstance(ticket, Ticket)
    assert (ticket.id, ticket.priority, ticket.created_at.hour) == (4411, "high", 14)
    assert (ticket.subject, ticket.status, ticket.assignee, ticket.tags) == ("Refund not received", "open", "grace", ["billing"])


@test("created_at is a timezone-aware datetime")
def _():
    assert parse_ticket(response(FULL)).created_at == datetime(2026, 9, 28, 14, 3, tzinfo=timezone.utc)


@test("Optional fields get their defaults")
def _():
    ticket = parse_ticket(response({"id": 4412, "subject": "Login loop", "status": "pending", "created_at": "2026-09-29T08:00:00Z"}))
    assert (ticket.priority, ticket.assignee, ticket.tags) == ("normal", None, [])


@test("Refuses a status or priority it doesn't know")
def _():
    raises(ValidationError, parse_ticket, response({**FULL, "status": "escalated"}))
    raises(ValidationError, parse_ticket, response({**FULL, "priority": "p1"}))


@hidden("Refuses a ticket missing a required field")
def _():
    for field in ["id", "subject", "status", "created_at"]:
        body = {key: value for key, value in FULL.items() if key != field}
        raises(ValidationError, parse_ticket, response(body))


@hidden("Ignores unknown keys, and each ticket gets its own tags list")
def _():
    first = parse_ticket(response({"id": 1, "subject": "A", "status": "open", "created_at": "2026-09-29T08:00:00Z"}))
    second = parse_ticket(response({"id": 2, "subject": "B", "status": "open", "created_at": "2026-09-29T08:00:00Z"}))
    first.tags.append("vip")
    assert second.tags == []
    assert not hasattr(parse_ticket(response(FULL)), "sla_policy")
