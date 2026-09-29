import json

from plp import hidden, raises, test
from solution import DEAL_FIELDS, DEALS, page_of, search_deals

ORDERS = [{"order_id": f"10{n:02d}", "status": "shipped", "internal": "x" * 50} for n in range(1, 24)]


@test("Page 2 of the dental deals")
def _():
    result = search_deals("dental", page=2)
    assert result["total"] == 42 and result["page"] == 2 and result["page_size"] == 10 and result["next_page"] == 3
    assert result["results"][0] == {"id": "D-11", "company": "Bright Dental 11", "stage": "proposal", "value": 1211}
    assert [d["id"] for d in result["results"]] == [f"D-{n}" for n in range(11, 21)]


@test("Keeps only the requested fields, and stays small")
def _():
    first = search_deals("DENTAL")
    assert all(set(d) == set(DEAL_FIELDS) for d in first["results"])
    assert len(json.dumps(first)) < 1_500, "No owner notes in the observation"


@test("The last page has no next page")
def _():
    last = page_of(ORDERS, page=3, page_size=10, fields=("order_id",))
    assert last["results"] == [{"order_id": "1021"}, {"order_id": "1022"}, {"order_id": "1023"}]
    assert last["next_page"] is None
    assert page_of(ORDERS, page=2, page_size=10, fields=("order_id",))["next_page"] == 3


@test("page_size is clamped between 1 and the maximum")
def _():
    big = page_of(ORDERS, page_size=500, fields=("order_id",), max_page_size=20)
    assert (len(big["results"]), big["page_size"], big["next_page"]) == (20, 20, 2)
    assert page_of(ORDERS, page_size=0, fields=("order_id",))["page_size"] == 1


@hidden("Past the end is empty; below 1 is an error")
def _():
    assert page_of(ORDERS, page=9, fields=("order_id",)) == {
        "results": [], "total": 23, "page": 9, "page_size": 10, "next_page": None}
    raises(ValueError, page_of, ORDERS, page=0, fields=("order_id",))


@hidden("A page that ends exactly at the last item has no next page")
def _():
    assert page_of(ORDERS[:20], page=2, fields=("status",))["next_page"] is None
    assert search_deals("kiln", page_size=25)["total"] == 18
    assert search_deals("nothing here") == {"results": [], "total": 0, "page": 1, "page_size": 10, "next_page": None}
