import inspect
from itertools import islice

from plp import test, hidden
from solution import paginate


class FakeCRM:
    """A paginated API that records which cursors were requested."""

    def __init__(self, pages):
        self.pages = pages
        self.requests = []

    def fetch_page(self, cursor):
        self.requests.append(cursor)
        return self.pages[cursor]


def numbered_pages(count, per_page=3):
    """count pages of per_page customers each, chained by cursor."""
    pages = {}
    for n in range(count):
        cursor = None if n == 0 else f"c{n + 1}"
        following = f"c{n + 2}" if n < count - 1 else None
        items = [f"customer-{n * per_page + i + 1}" for i in range(per_page)]
        pages[cursor] = {"items": items, "next_cursor": following}
    return pages


@test("Yields every item from every page")
def _():
    pages = {
        None: {"items": ["ada", "grace"], "next_cursor": "c2"},
        "c2": {"items": ["linus"], "next_cursor": None},
    }
    assert list(paginate(lambda cursor: pages[cursor])) == ["ada", "grace", "linus"]


@test("Makes no request until the first item is asked for")
def _():
    crm = FakeCRM(numbered_pages(5))
    customers = paginate(crm.fetch_page)
    assert inspect.isgenerator(customers), "paginate(...) should return a generator"
    assert crm.requests == [], "calling paginate() shouldn't fetch anything yet"


@test("Fetches only the pages it needs")
def _():
    crm = FakeCRM(numbered_pages(100))
    first_four = list(islice(paginate(crm.fetch_page), 4))
    assert first_four == ["customer-1", "customer-2", "customer-3", "customer-4"]
    assert crm.requests == [None, "c2"]


@hidden("Follows the cursors to the last page")
def _():
    crm = FakeCRM(numbered_pages(4, per_page=2))
    assert len(list(paginate(crm.fetch_page))) == 8
    assert crm.requests == [None, "c2", "c3", "c4"]


@hidden("Carries on past an empty page")
def _():
    pages = {
        None: {"items": [], "next_cursor": "c2"},
        "c2": {"items": [], "next_cursor": "c3"},
        "c3": {"items": ["margaret"], "next_cursor": None},
    }
    assert list(paginate(lambda cursor: pages[cursor])) == ["margaret"]


@hidden("A single empty page yields nothing")
def _():
    crm = FakeCRM({None: {"items": [], "next_cursor": None}})
    assert list(paginate(crm.fetch_page)) == []
    assert crm.requests == [None]
