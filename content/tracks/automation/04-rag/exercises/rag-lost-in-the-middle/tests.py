from plp import hidden, test
from solution import order_for_context


@test("Orders five chunks with the best at the edges")
def _():
    assert order_for_context(["best", "second", "third", "fourth", "fifth"]) == ["best", "third", "fifth", "fourth", "second"]


@test("Works for an even number of chunks")
def _():
    assert order_for_context(["leave#0", "leave#3", "pto#1", "leave#1"]) == ["leave#0", "pto#1", "leave#1", "leave#3"]


@test("The best and second best are always first and last")
def _():
    ranked = [f"chunk-{n}" for n in range(1, 10)]
    ordered = order_for_context(ranked)
    assert (ordered[0], ordered[-1]) == ("chunk-1", "chunk-2")
    assert sorted(ordered) == sorted(ranked)


@hidden("Doesn't change its input, and handles zero, one or two chunks")
def _():
    ranked = [{"id": "leave#0"}, {"id": "leave#1"}, {"id": "leave#2"}]
    assert [c["id"] for c in order_for_context(ranked)] == ["leave#0", "leave#2", "leave#1"]
    assert [c["id"] for c in ranked] == ["leave#0", "leave#1", "leave#2"]
    assert order_for_context([]) == []
    assert order_for_context(["only"]) == ["only"]
    assert order_for_context(["a#0", "b#0"]) == ["a#0", "b#0"]
