import inspect

from plp import test, hidden
from solution import flatten, to_flat_dict


@test("Flattens nested dicts and lists into dotted keys")
def _():
    order = {
        "id": "A1",
        "customer": {"name": "Ada", "address": {"city": "Leeds"}},
        "lines": [{"sku": "MUG", "qty": 2}],
        "tags": ["gift", "fragile"],
    }
    assert list(flatten(order)) == [
        ("id", "A1"),
        ("customer.name", "Ada"),
        ("customer.address.city", "Leeds"),
        ("lines.0.sku", "MUG"),
        ("lines.0.qty", 2),
        ("tags.0", "gift"),
        ("tags.1", "fragile"),
    ]


@test("A list of several dicts")
def _():
    order = {"lines": [{"sku": "MUG"}, {"sku": "V60", "extras": {"gift_wrap": True}}]}
    assert to_flat_dict(order) == {"lines.0.sku": "MUG", "lines.1.sku": "V60", "lines.1.extras.gift_wrap": True}


@test("flatten is still a generator")
def _():
    assert inspect.isgenerator(flatten({"id": "A1"})), "flatten(...) should return a generator"


@hidden("A flat object is unchanged")
def _():
    assert list(flatten({"id": "A1", "total": 12.5, "paid": False, "note": None})) == [
        ("id", "A1"), ("total", 12.5), ("paid", False), ("note", None),
    ]


@hidden("Deep nesting")
def _():
    payload = {"a": {"b": {"c": {"d": {"e": "deep"}}}}}
    assert to_flat_dict(payload) == {"a.b.c.d.e": "deep"}


@hidden("Empty objects and lists have no leaves")
def _():
    assert list(flatten({"meta": {}, "lines": [], "id": "A1"})) == [("id", "A1")]
