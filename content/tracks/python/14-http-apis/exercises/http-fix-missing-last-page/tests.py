from itertools import islice

import httpx

from plp import hidden, test
from solution import iter_contacts


class Crm:
    """A fake CRM with cursor pagination. Keeps the cursor of every request."""

    def __init__(self, count):
        self.contacts = [{"id": f"ct_{n:03}", "email": f"lead{n}@example.com"} for n in range(1, count + 1)]
        self.cursors = []

    def __call__(self, request):
        cursor = request.url.params.get("cursor")
        self.cursors.append(cursor)
        start = int(cursor.removeprefix("c_")) if cursor else 0
        end = start + int(request.url.params["limit"])
        has_more = end < len(self.contacts)
        return httpx.Response(200, json={
            "data": self.contacts[start:end],
            "has_more": has_more,
            "next_cursor": f"c_{end}" if has_more else None,
        })

    def client(self):
        return httpx.Client(transport=httpx.MockTransport(self), base_url="https://api.crm.example", timeout=10)


@test("Exports all 120 contacts from three pages")
def _():
    crm = Crm(120)
    assert len(list(iter_contacts(crm.client()))) == 120
    assert crm.cursors == [None, "c_50", "c_100"]


@test("A single page of 30 is exported, not dropped")
def _():
    crm = Crm(30)
    assert [contact["id"] for contact in iter_contacts(crm.client())][-1:] == ["ct_030"]
    assert len(crm.cursors) == 1


@test("Contacts come out in order, with none repeated")
def _():
    crm = Crm(120)
    ids = [contact["id"] for contact in iter_contacts(crm.client())]
    assert ids[-3:] == ["ct_118", "ct_119", "ct_120"], "The last page's contacts are missing"
    assert ids == sorted(set(ids)), "Contacts should come out once each, in the CRM's order"


@hidden("Exactly two full pages")
def _():
    crm = Crm(100)
    assert len(list(iter_contacts(crm.client()))) == 100
    assert crm.cursors == [None, "c_50"]


@hidden("Still lazy, and an empty CRM is one request")
def _():
    crm = Crm(120)
    assert len(list(islice(iter_contacts(crm.client(), page_size=10), 15))) == 15
    assert crm.cursors == [None, "c_10"]
    empty = Crm(0)
    assert list(iter_contacts(empty.client())) == []
    assert empty.cursors == [None]
