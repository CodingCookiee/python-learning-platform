from plp import hidden, test
from solution import parse_plan


@test("Parses the example plan")
def _():
    reply = "Here's my plan:\n1. Look up account C-301\n2. List its open tickets\n\nLet me know if that works."
    assert parse_plan(reply) == ["Look up account C-301", "List its open tickets"]


@test("Accepts 1) as well as 1., and indented steps")
def _():
    assert parse_plan("1) Check unpaid invoices\n  2. Search recent news  \n10) Write the brief") == [
        "Check unpaid invoices", "Search recent news", "Write the brief"]


@test("A reply with no steps gives an empty plan")
def _():
    assert parse_plan("I don't need a plan for this; the answer is on the account page.") == []


@hidden("Ignores numbers that aren't step markers")
def _():
    text = "Plan for INV-2291:\n1. Fetch invoice 2291\n2026 was a good year\n2.Check payments\n3. Draft the reminder"
    assert parse_plan(text) == ["Fetch invoice 2291", "Draft the reminder"]
