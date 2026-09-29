from itertools import islice

from plp import test, hidden, raises
from solution import PagedResults


def orders_api(total=23, page_size=10):
    """A fake API with `total` orders, and the list of pages it was asked for."""
    calls = []

    def fetch_page(page):
        calls.append(page)
        start = page * page_size
        return [f"ORD-{n:04}" for n in range(start, min(start + page_size, total))], total

    return fetch_page, calls


@test("Fetches only the pages it needs")
def _():
    fetch_page, calls = orders_api()
    orders = PagedResults(fetch_page, page_size=10)
    assert orders[12] == "ORD-0012"
    assert calls == [1]
    assert len(orders) == 23
    assert calls == [1]
    assert orders[-1] == "ORD-0022"
    assert orders[8:11] == ["ORD-0008", "ORD-0009", "ORD-0010"]
    assert calls == [1, 2, 0]


@test("len() fetches page 0 when nothing is known yet")
def _():
    fetch_page, calls = orders_api()
    orders = PagedResults(fetch_page, page_size=10)
    assert len(orders) == 23
    assert calls == [0]
    assert orders[3] == "ORD-0003"
    assert calls == [0]


@test("Iterating walks every item, one page at a time")
def _():
    fetch_page, calls = orders_api()
    orders = PagedResults(fetch_page, page_size=10)
    assert list(islice(orders, 3)) == ["ORD-0000", "ORD-0001", "ORD-0002"]
    assert calls == [0]
    assert list(orders) == [f"ORD-{n:04}" for n in range(23)]
    assert calls == [0, 1, 2]


@hidden("An index past the end raises IndexError")
def _():
    fetch_page, _ = orders_api()
    raises(IndexError, PagedResults(fetch_page, 10).__getitem__, 23)
    raises(IndexError, PagedResults(fetch_page, 10).__getitem__, 40)
    raises(IndexError, PagedResults(fetch_page, 10).__getitem__, -24)


@hidden("in, reversed() and index() work, and repeat reads don't refetch")
def _():
    fetch_page, calls = orders_api()
    orders = PagedResults(fetch_page, page_size=10)
    assert "ORD-0015" in orders
    assert "ORD-0099" not in orders
    assert orders.index("ORD-0021") == 21
    assert list(reversed(orders))[:2] == ["ORD-0022", "ORD-0021"]
    assert sorted(calls) == [0, 1, 2]


@hidden("Works with other page sizes and slice steps")
def _():
    fetch_page, calls = orders_api(total=7, page_size=3)
    orders = PagedResults(fetch_page, page_size=3)
    assert orders[::3] == ["ORD-0000", "ORD-0003", "ORD-0006"]
    assert orders[-2:] == ["ORD-0005", "ORD-0006"]
    assert len(orders) == 7
    assert sorted(calls) == [0, 1, 2]
    assert PagedResults(orders_api(total=0)[0], 10)[:] == []
