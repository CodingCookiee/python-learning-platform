from itertools import islice

import httpx

from plp import hidden, raises, test
from solution import PaginationError, iter_tickets


class Helpdesk:
    """A fake helpdesk API with cursor pagination. loop_back_to makes the last page point back at an earlier cursor."""

    def __init__(self, count, loop_back_to=None, broken_page=None):
        self.tickets = [{"id": f"tk_{n}", "subject": f"Ticket {n}"} for n in range(1, count + 1)]
        self.loop_back_to = loop_back_to
        self.broken_page = broken_page
        self.cursors = []

    def __call__(self, request):
        cursor = request.url.params.get("cursor")
        self.cursors.append(cursor)
        if self.broken_page is not None and len(self.cursors) == self.broken_page:
            return httpx.Response(500, json={"error": "internal"})
        limit = int(request.url.params["limit"])
        start = int(cursor.removeprefix("t_")) if cursor else 0
        end = start + limit
        if end >= len(self.tickets):
            next_cursor = f"t_{self.loop_back_to}" if self.loop_back_to is not None else None
        else:
            next_cursor = f"t_{end}"
        return httpx.Response(200, json={"tickets": self.tickets[start:end], "next_cursor": next_cursor})

    def client(self):
        return httpx.Client(transport=httpx.MockTransport(self), base_url="https://api.helpdesk.example", timeout=10)


def collect(pages):
    """Every ticket id yielded before the generator stopped, and the error (if any) it raised."""
    seen = []
    try:
        for ticket in pages:
            seen.append(ticket["id"])
    except PaginationError as error:
        return seen, str(error)
    return seen, None


@test("Refuses a cursor it has already fetched, after yielding what it has")
def _():
    helpdesk = Helpdesk(4, loop_back_to=2)
    assert collect(iter_tickets(helpdesk.client(), limit=2)) == (
        ["tk_1", "tk_2", "tk_3", "tk_4"],
        "cursor 't_2' was already fetched",
    )
    assert helpdesk.cursors == [None, "t_2"]


@test("Follows the cursor to the end when nothing is wrong")
def _():
    helpdesk = Helpdesk(7)
    assert collect(iter_tickets(helpdesk.client(), limit=3)) == ([f"tk_{n}" for n in range(1, 8)], None)
    assert helpdesk.cursors == [None, "t_3", "t_6"]


@test("Stops at max_pages")
def _():
    helpdesk = Helpdesk(10)
    assert collect(iter_tickets(helpdesk.client(), limit=2, max_pages=3)) == (
        ["tk_1", "tk_2", "tk_3", "tk_4", "tk_5", "tk_6"],
        "more than 3 pages",
    )
    assert len(helpdesk.cursors) == 3


@test("Exactly max_pages pages is fine")
def _():
    helpdesk = Helpdesk(6)
    assert collect(iter_tickets(helpdesk.client(), limit=2, max_pages=3)) == ([f"tk_{n}" for n in range(1, 7)], None)


@hidden("A loop back to an earlier page is caught too")
def _():
    helpdesk = Helpdesk(6, loop_back_to=2)
    assert collect(iter_tickets(helpdesk.client(), limit=2)) == (
        ["tk_1", "tk_2", "tk_3", "tk_4", "tk_5", "tk_6"],
        "cursor 't_2' was already fetched",
    )


@hidden("Still lazy, and a failed page raises")
def _():
    helpdesk = Helpdesk(100)
    assert len(list(islice(iter_tickets(helpdesk.client(), limit=10), 25))) == 25
    assert len(helpdesk.cursors) == 3
    raises(httpx.HTTPStatusError, list, iter_tickets(Helpdesk(10, broken_page=2).client(), limit=5))
