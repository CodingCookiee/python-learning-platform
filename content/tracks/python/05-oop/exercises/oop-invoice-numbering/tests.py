from plp import test, hidden
from solution import Invoice

# The class attributes as written, before any test creates an invoice
STARTING = dict(vars(Invoice))


def reset():
    """Put the class back to its starting state, as if no invoices existed yet."""
    Invoice.next_number = 1
    Invoice.vat_rate = 0.2


@test("Numbers invoices in order and adds VAT")
def _():
    reset()
    first = Invoice("Northwind", 100)
    second = Invoice("Contoso", 250)
    assert (first.number, second.number) == ("INV-0001", "INV-0002")
    assert second.gross() == 300.0


@test("Starts at 1 with a 20% VAT rate")
def _():
    assert STARTING.get("next_number") == 1, "Invoice.next_number should start at 1"
    assert STARTING.get("vat_rate") == 0.2, "Invoice.vat_rate should start at 0.2"


@test("The counter lives on the class, not on each invoice")
def _():
    reset()
    invoice = Invoice("Northwind", 100)
    assert Invoice.next_number == 2
    assert "next_number" not in vars(invoice), "The invoice has its own next_number attribute"


@test("Changing the class rate changes every invoice")
def _():
    reset()
    invoice = Invoice("Northwind", 100)
    Invoice.vat_rate = 0.25
    assert invoice.gross() == 125.0
    reset()


@hidden("One invoice can be made VAT-exempt")
def _():
    reset()
    exempt = Invoice("Charity", 100)
    normal = Invoice("Northwind", 100)
    exempt.vat_rate = 0
    assert exempt.gross() == 100
    assert normal.gross() == 120.0


@hidden("Pads to four digits and keeps counting past 9")
def _():
    reset()
    invoices = [Invoice("Northwind", 10) for _ in range(12)]
    assert invoices[8].number == "INV-0009"
    assert invoices[11].number == "INV-0012"


@hidden("Rounds gross to 2 decimals")
def _():
    reset()
    assert Invoice("Contoso", 19.99).gross() == 23.99
