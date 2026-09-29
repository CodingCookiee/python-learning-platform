import json
from datetime import date
from decimal import Decimal

from pydantic import ValidationError

from plp import hidden, raises, test
from solution import Invoice, parse_invoice

GOOD = {
    "invoice_number": "INV-2291",
    "vendor": "Kiln Supplies",
    "issue_date": "2026-09-15",
    "due_date": "2026-10-15",
    "currency": "eur",
    "total": "1240.50",
}


def reply(**changes):
    return "Extracted: " + json.dumps({**GOOD, **changes})


@test("Parses the example invoice")
def _():
    invoice = parse_invoice(reply())
    assert invoice.currency == "EUR"
    assert invoice.total == Decimal("1240.50")
    assert invoice.due_date == date(2026, 10, 15)
    assert invoice.vendor == "Kiln Supplies"


@test("Normalises the currency's case and spaces, and refuses unknown currencies")
def _():
    assert parse_invoice(reply(currency=" gbp ")).currency == "GBP"
    raises(ValidationError, parse_invoice, reply(currency="YEN"))


@test("Refuses an empty invoice number and a missing vendor")
def _():
    raises(ValidationError, parse_invoice, reply(invoice_number=""), match="invoice_number")
    body = {key: value for key, value in GOOD.items() if key != "vendor"}
    raises(ValidationError, parse_invoice, json.dumps(body), match="vendor")


@test("Refuses a total that's zero, negative or has fractions of a cent")
def _():
    raises(ValidationError, parse_invoice, reply(total="0"), match="total")
    raises(ValidationError, parse_invoice, reply(total=-12), match="total")
    raises(ValidationError, parse_invoice, reply(total="12.505"), match="total")


@test("Refuses a due date before the issue date")
def _():
    raises(ValidationError, parse_invoice, reply(due_date="2026-09-01"), match="due_date is before issue_date")


@hidden("Refuses European number formats and dates written as phrases")
def _():
    raises(ValidationError, parse_invoice, reply(total="1.240,50"), match="total")
    raises(ValidationError, parse_invoice, reply(due_date="next Friday"), match="due_date")


@hidden("Raises ValueError when the reply has no JSON, and the model works on its own")
def _():
    raises(ValueError, parse_invoice, "I couldn't read that invoice.")
    invoice = Invoice.model_validate({**GOOD, "issue_date": "2026-10-15"})
    assert invoice.issue_date == invoice.due_date
