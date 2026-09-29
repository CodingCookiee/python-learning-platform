import json
from itertools import islice

import httpx

import solution
from plp import hidden, raises, test

KEY = "hd_live_3b1f"


def ticket(ticket_id, status="open"):
    return {"id": ticket_id, "subject": f"Ticket {ticket_id}", "status": status, "created_at": "2026-09-28T14:03:00Z"}


class Helpdesk:
    """A fake helpdesk API. `script` is a list of failures to give first, one per request:
    a status code, (status, Retry-After), or "drop" for a dropped connection."""

    def __init__(self, *script, page_size=2):
        self.script = list(script)
        self.page_size = page_size
        self.tickets = [ticket(4411), ticket(4415), ticket(4416, "closed"), ticket(4418)]
        self.comments = []
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        if self.script:
            step = self.script.pop(0)
            if step == "drop":
                raise httpx.ReadTimeout("no answer", request=request)
            status, wait = step if isinstance(step, tuple) else (step, None)
            headers = {"X-Request-Id": f"req_{len(self.requests)}"}
            if wait is not None:
                headers["Retry-After"] = wait
            return httpx.Response(status, headers=headers, json={"error": {"message": f"scripted {status}"}})
        if request.headers.get("authorization") != f"Bearer {KEY}":
            return httpx.Response(401, json={"error": {"message": "bad token"}})
        path = request.url.path
        if path == "/v2/tickets":
            matching = [t for t in self.tickets if t["status"] == request.url.params["status"]]
            start = int(request.url.params.get("cursor", "0"))
            end = start + self.page_size
            return httpx.Response(200, json={
                "tickets": matching[start:end],
                "next_cursor": str(end) if end < len(matching) else None,
            })
        parts = path.split("/")
        by_id = {t["id"]: t for t in self.tickets}
        if len(parts) >= 4 and parts[3].isdigit() and int(parts[3]) not in by_id:
            return httpx.Response(404, json={"error": {"message": f"ticket {parts[3]} not found"}})
        if len(parts) == 4:
            return httpx.Response(200, json={**by_id[int(parts[3])], "sla_policy": "gold"})
        if len(parts) == 5 and parts[4] == "comments" and request.method == "POST":
            comment = {"id": f"cm_{len(self.comments) + 1}", "ticket_id": int(parts[3]), **json.loads(request.content)}
            self.comments.append(comment)
            return httpx.Response(201, json=comment)
        return httpx.Response(404, json={"error": {"message": "no such endpoint"}})


def client_for(server, waits=None, key=KEY, **options):
    sleep = (waits.append if waits is not None else (lambda seconds: None))
    return solution.HelpdeskClient(key, transport=httpx.MockTransport(server), sleep=sleep, **options)


@test("Gets, lists and comments, with typed results and typed errors")
def _():
    server = Helpdesk()
    with client_for(server) as helpdesk:
        found = helpdesk.get_ticket(4411)
        assert isinstance(found, solution.Ticket), "get_ticket should return a Ticket"
        assert found.id == 4411
        assert [t.id for t in helpdesk.iter_tickets()] == [4411, 4415, 4418]
        comment = helpdesk.add_comment(4411, "Refund issued today.")
        assert isinstance(comment, solution.Comment), "add_comment should return a Comment"
        assert comment.id == "cm_1"
        error = raises(solution.NotFoundError, helpdesk.get_ticket, 9999).value
        assert str(error) == "HTTP 404: ticket 9999 not found"


@test("Sends the right requests, with the token and timeouts")
def _():
    server = Helpdesk()
    with client_for(server) as helpdesk:
        list(helpdesk.iter_tickets("open"))
        helpdesk.add_comment(4415, "Password reset link sent.", public=False)
    assert [(r.method, r.url.path, dict(r.url.params)) for r in server.requests] == [
        ("GET", "/v2/tickets", {"status": "open", "limit": "100"}),
        ("GET", "/v2/tickets", {"status": "open", "limit": "100", "cursor": "2"}),
        ("POST", "/v2/tickets/4415/comments", {}),
    ]
    assert json.loads(server.requests[-1].content) == {"body": "Password reset link sent.", "public": False}
    assert {r.headers.get("authorization") for r in server.requests} == {f"Bearer {KEY}"}
    assert server.requests[0].extensions["timeout"] == {"connect": 3, "read": 10, "write": 10, "pool": 10}


@test("GETs are retried with backoff and Retry-After")
def _():
    server = Helpdesk(503, (429, "7"))
    waits = []
    with client_for(server, waits) as helpdesk:
        assert helpdesk.get_ticket(4418).id == 4418
    assert waits == [1, 7.0]
    assert len(server.requests) == 3


@test("No httpx exception escapes")
def _():
    with client_for(Helpdesk(500, 502, 503)) as helpdesk:
        error = raises(solution.ServerError, helpdesk.get_ticket, 4411).value
        assert (error.status_code, error.request_id) == (503, "req_3")
    with client_for(Helpdesk("drop", "drop", "drop")) as helpdesk:
        error = raises(solution.HelpdeskConnectionError, helpdesk.get_ticket, 4411).value
        assert isinstance(error.__cause__, httpx.TransportError), "Raise it from the httpx error"
    with client_for(Helpdesk(), key="hd_live_revoked") as helpdesk:
        raises(solution.AuthenticationError, helpdesk.get_ticket, 4411)


@hidden("A POST is sent once, never retried")
def _():
    server = Helpdesk(503)
    waits = []
    with client_for(server, waits) as helpdesk:
        raises(solution.ServerError, helpdesk.add_comment, 4411, "Hello")
    assert (len(server.requests), waits, server.comments) == (1, [], [])
    dropped = Helpdesk("drop")
    with client_for(dropped) as helpdesk:
        raises(solution.HelpdeskConnectionError, helpdesk.add_comment, 4411, "Hello")
    assert len(dropped.requests) == 1


@hidden("iter_tickets is lazy and works for other statuses")
def _():
    server = Helpdesk()
    with client_for(server) as helpdesk:
        assert [t.id for t in islice(helpdesk.iter_tickets(), 1)] == [4411]
        assert len(server.requests) == 1
        assert [t.status for t in helpdesk.iter_tickets("closed")] == ["closed"]


@hidden("Errors that aren't worth retrying fail at once, and max_attempts is respected")
def _():
    server = Helpdesk(422)
    waits = []
    with client_for(server, waits) as helpdesk:
        raises(solution.BadRequestError, helpdesk.get_ticket, 4411)
    assert (len(server.requests), waits) == (1, [])
    server = Helpdesk(503, 503, 503, 503, 503)
    with client_for(server, max_attempts=5) as helpdesk:
        raises(solution.ServerError, helpdesk.get_ticket, 4411)
    assert len(server.requests) == 5
