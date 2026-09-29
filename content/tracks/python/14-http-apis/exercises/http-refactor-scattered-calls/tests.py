import json

import httpx

import solution
from plp import defined_names, hidden, raises, solution_source, test

KEY = "hd_live_3b1f"


class Helpdesk:
    """A fake helpdesk API that keeps every request."""

    def __init__(self):
        self.tickets = {
            4411: {"id": 4411, "subject": "Refund not received", "status": "open"},
            4415: {"id": 4415, "subject": "Can't log in", "status": "open"},
            4420: {"id": 4420, "subject": "Invoice address", "status": "closed"},
        }
        self.requests = []

    def __call__(self, request):
        self.requests.append(request)
        if request.headers.get("authorization") != f"Bearer {KEY}":
            return httpx.Response(401, json={"error": {"message": "bad token"}})
        parts = request.url.path.split("/")
        if request.url.path == "/v2/tickets" and request.method == "GET":
            status = request.url.params.get("status")
            return httpx.Response(200, json={"tickets": [t for t in self.tickets.values() if t["status"] == status]})
        if len(parts) == 4 and parts[2] == "tickets" and parts[3].isdigit():
            ticket = self.tickets.get(int(parts[3]))
            if ticket is None:
                return httpx.Response(404, json={"error": {"message": "ticket not found"}})
            if request.method == "PATCH":
                ticket.update(json.loads(request.content))
            return httpx.Response(200, json=ticket)
        return httpx.Response(404, json={"error": {"message": "no such endpoint"}})


def helpdesk_client(server, key=KEY):
    return solution.HelpdeskClient(key, transport=httpx.MockTransport(server))


@test("Gets, lists and closes tickets")
def _():
    server = Helpdesk()
    with helpdesk_client(server) as helpdesk:
        assert helpdesk.get_ticket(4411) == {"id": 4411, "subject": "Refund not received", "status": "open"}
        assert [ticket["id"] for ticket in helpdesk.list_open_tickets()] == [4411, 4415]
        assert helpdesk.close_ticket(4411) == {"id": 4411, "subject": "Refund not received", "status": "closed"}
    assert [(r.method, r.url.path, r.url.query) for r in server.requests] == [
        ("GET", "/v2/tickets/4411", b""),
        ("GET", "/v2/tickets", b"status=open"),
        ("PATCH", "/v2/tickets/4411", b""),
    ]


@test("Every request has the token, the User-Agent and the timeouts")
def _():
    server = Helpdesk()
    with helpdesk_client(server) as helpdesk:
        helpdesk.get_ticket(4415)
        helpdesk.list_open_tickets()
        helpdesk.close_ticket(4415)
    for request in server.requests:
        assert request.headers.get("user-agent") == "support-bot/2.1", f"{request.method} {request.url.path}"
        assert request.headers.get("authorization") == f"Bearer {KEY}"
        assert request.extensions["timeout"] == {"connect": 3, "read": 10, "write": 10, "pool": 10}, f"{request.method} {request.url.path}"


@test("Every method raises for an error status")
def _():
    with helpdesk_client(Helpdesk()) as helpdesk:
        raises(httpx.HTTPStatusError, helpdesk.get_ticket, 9999)
        raises(httpx.HTTPStatusError, helpdesk.close_ticket, 9999)
    with helpdesk_client(Helpdesk(), key="hd_live_revoked") as helpdesk:
        raises(httpx.HTTPStatusError, helpdesk.list_open_tickets)


@test("One client, one status check, and the old functions are gone")
def _():
    source = solution_source()
    assert source.count("httpx.Client(") == 1, "Create the httpx.Client once, in __init__"
    assert source.count("raise_for_status") == 1, "Check the status in one place"
    leftovers = sorted({"get_ticket", "list_open_tickets", "close_ticket"} & set(defined_names("function")))
    assert leftovers == [], f"Remove the old functions: {', '.join(leftovers)}"


@hidden("Closing the client closes its connection")
def _():
    helpdesk = helpdesk_client(Helpdesk())
    with helpdesk:
        helpdesk.get_ticket(4411)
    raises(RuntimeError, helpdesk.get_ticket, 4411)
    other = helpdesk_client(Helpdesk())
    other.close()
    raises(RuntimeError, other.list_open_tickets)
