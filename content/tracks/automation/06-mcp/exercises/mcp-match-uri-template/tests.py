from plp import hidden, test
from solution import match_template


@test("Matches the prompt's three examples")
def _():
    assert match_template("wiki://people/{handle}", "wiki://people/ada") == {"handle": "ada"}
    assert match_template("orders://{order_id}/invoice", "orders://1042/invoice") == {"order_id": "1042"}
    assert match_template("wiki://people/{handle}", "wiki://people/ada/photo") is None


@test("Several variables, and a different scheme or path is no match")
def _():
    assert match_template("clinic://{site}/slots/{day}", "clinic://leith/slots/2026-10-01") == {
        "site": "leith", "day": "2026-10-01"}
    assert match_template("wiki://people/{handle}", "wiki://teams/ops") is None
    assert match_template("wiki://people/{handle}", "file://people/ada") is None


@test("A variable can't be empty")
def _():
    assert match_template("wiki://people/{handle}", "wiki://people/") is None


@hidden("Dots and other regex characters in the template are literal")
def _():
    assert match_template("docs://handbook/{page}.md", "docs://handbook/returns.md") == {"page": "returns"}
    assert match_template("docs://handbook/{page}.md", "docs://handbook/returnsXmd") is None
    assert match_template("orders://{order_id}?format=pdf", "orders://1042?format=pdf") == {"order_id": "1042"}


@hidden("The whole URI must match, not just its start")
def _():
    assert match_template("orders://{order_id}/invoice", "orders://1042/invoice/extra") is None
    assert match_template("orders://{order_id}/invoice", "xorders://1042/invoice") is None


@hidden("A template with no variables matches only itself")
def _():
    assert match_template("policy://returns", "policy://returns") == {}
    assert match_template("policy://returns", "policy://returnsx") is None
