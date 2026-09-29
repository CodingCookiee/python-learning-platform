from datetime import date
from decimal import Decimal
from typing import Literal

from plp import hidden, test
from pydantic import BaseModel
from solution import Score, schema_score


class Invoice(BaseModel):
    invoice_number: str
    vendor: str
    currency: Literal["EUR", "GBP", "USD"]
    total: Decimal


class DatedInvoice(Invoice):
    issued_on: date


OUTPUT = '{"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "currency": "EUR", "total": 1240.5}'


@test("Passes the example, with the total compared as a Decimal")
def _():
    assert schema_score(OUTPUT, Invoice, {"invoice_number": "INV-2291", "total": "1240.50"}) == Score(True, "ok")


@test("A value outside the schema fails as invalid, naming the field")
def _():
    assert schema_score(OUTPUT.replace("EUR", "euro"), Invoice, {"total": "1240.50"}) == Score(
        False, "invalid: currency: Input should be 'EUR', 'GBP' or 'USD'"
    )


@test("A wrong value fails, naming each wrong field")
def _():
    output = OUTPUT.replace("INV-2291", "INV-2219").replace("1240.5", "1204.5")
    result = schema_score(output, Invoice, {"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "total": "1240.50"})
    assert result.passed is False
    assert result.reason.startswith("wrong ")
    assert "invoice_number" in result.reason
    assert "total" in result.reason
    assert "vendor" not in result.reason


@test("Output that isn't JSON fails instead of crashing")
def _():
    result = schema_score("Here is the invoice: INV-2291, 1240.50 EUR", Invoice, {"total": "1240.50"})
    assert result.passed is False
    assert result.reason.startswith("not JSON")


@hidden("Lists every validation problem, separated by '; '")
def _():
    result = schema_score('{"invoice_number": "INV-2291", "currency": "EUR", "total": "lots"}', Invoice, {})
    assert result.passed is False
    assert result.reason.startswith("invalid: ")
    assert "vendor: Field required" in result.reason
    assert "total: " in result.reason
    assert "; " in result.reason


@hidden("Converts dates from the case before comparing")
def _():
    output = OUTPUT[:-1] + ', "issued_on": "2026-09-01"}'
    assert schema_score(output, DatedInvoice, {"issued_on": "2026-09-01", "total": "1240.5"}) == Score(True, "ok")
    assert schema_score(output, DatedInvoice, {"issued_on": "2026-09-02"}).passed is False
