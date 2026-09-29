from plp import hidden, test
from solution import to_items


@test("Wraps each row under json")
def _():
    assert to_items([{"email": "amira@example.com"}, {"email": "tom@example.com"}]) == [
        {"json": {"email": "amira@example.com"}},
        {"json": {"email": "tom@example.com"}},
    ]


@test("No rows, no items")
def _():
    assert to_items([]) == []


@test("Changing an item doesn't change the original row")
def _():
    rows = [{"email": "amira@example.com", "score": 80}]
    items = to_items(rows)
    items[0]["json"]["score"] = 95
    assert rows == [{"email": "amira@example.com", "score": 80}]


@hidden("Keeps every field and the order of rows")
def _():
    rows = [{"id": n, "name": f"Lead {n}", "tags": ["web"]} for n in range(5)]
    assert [item["json"]["id"] for item in to_items(rows)] == [0, 1, 2, 3, 4]
    assert to_items(rows)[3]["json"] == {"id": 3, "name": "Lead 3", "tags": ["web"]}
