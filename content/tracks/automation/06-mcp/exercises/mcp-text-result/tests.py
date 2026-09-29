import json
from datetime import date
from decimal import Decimal

from plp import hidden, test
from solution import text_result


@test("An order becomes JSON text, and an error message stays as it is")
def _():
    assert text_result({"order_id": "1042", "status": "shipped"}) == {
        "content": [{"type": "text", "text": '{"order_id": "1042", "status": "shipped"}'}], "isError": False}
    assert text_result("Order 9999 not found", is_error=True) == {
        "content": [{"type": "text", "text": "Order 9999 not found"}], "isError": True}


@test("Lists, numbers, booleans and None are JSON too")
def _():
    assert text_result(["1042", "1043"])["content"][0]["text"] == '["1042", "1043"]'
    assert text_result(None)["content"][0]["text"] == "null"
    assert text_result(True)["content"][0]["text"] == "true"


@test("Dates and decimals don't crash it")
def _():
    text = text_result({"total": Decimal("48.50"), "shipped_on": date(2026, 9, 28)})["content"][0]["text"]
    assert json.loads(text) == {"total": "48.50", "shipped_on": "2026-09-28"}


@hidden("isError is always there, and a string is never quoted")
def _():
    assert text_result("")["isError"] is False
    assert text_result("12")["content"][0]["text"] == "12"
    assert text_result({"a": 1}, is_error=True)["isError"] is True
