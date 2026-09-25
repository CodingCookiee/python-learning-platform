from plp import test, hidden
from solution import build_url

SEARCH = "https://shop.example/search"


@test("Adds keyword arguments as a query string")
def _():
    assert build_url(SEARCH, q="mug", page=2) == "https://shop.example/search?q=mug&page=2"


@test("Leaves out parameters that are None")
def _():
    assert build_url(SEARCH, q="mug", colour=None) == "https://shop.example/search?q=mug"


@test("No parameters means no question mark")
def _():
    assert build_url(SEARCH) == SEARCH


@hidden("Keeps the order the caller used")
def _():
    assert build_url(SEARCH, sort="price", q="lamp") == "https://shop.example/search?sort=price&q=lamp"


@hidden("Only None parameters means no question mark")
def _():
    assert build_url(SEARCH, q=None, page=None) == SEARCH


@hidden("Keeps falsy values that aren't None")
def _():
    assert build_url(SEARCH, page=0, q="") == "https://shop.example/search?page=0&q="


@hidden("Accepts parameters from a dict with **")
def _():
    filters = {"category": "kitchen", "in_stock": True}
    assert build_url(SEARCH, **filters) == "https://shop.example/search?category=kitchen&in_stock=True"
