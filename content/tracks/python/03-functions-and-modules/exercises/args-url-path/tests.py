from plp import test, hidden
from solution import url_path


@test("Joins segments into a path")
def _():
    assert url_path("api", "v1", "orders", 1042) == "/api/v1/orders/1042"


@test("Drops slashes at the ends of segments")
def _():
    assert url_path("/api/", "users/") == "/api/users"


@test("No segments is the root path")
def _():
    assert url_path() == "/"


@hidden("Works with a single segment")
def _():
    assert url_path("health") == "/health"


@hidden("Takes numbers as segments")
def _():
    assert url_path("invoices", 2026, 9) == "/invoices/2026/9"
