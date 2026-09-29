import tempfile
from decimal import Decimal
from pathlib import Path

from plp import hidden, test
from solution import total_by_status

EXCEL_EXPORT = "status,order_id,amount\r\npaid,1001,19.99\r\nrefunded,1002,0.10\r\nrefunded,1003,0.20\r\npaid,1004,5.01\r\n,,\r\n,,\r\n"


def export(text, encoding):
    path = Path(tempfile.mkdtemp()) / "orders.csv"
    path.write_bytes(text.encode(encoding))
    return path


@test("Totals a file saved by Excel")
def _():
    assert total_by_status(export(EXCEL_EXPORT, "utf-8-sig")) == {"paid": Decimal("25.00"), "refunded": Decimal("0.30")}


@test("Totals are Decimals, exact to the penny")
def _():
    totals = total_by_status(export(EXCEL_EXPORT, "utf-8-sig"))
    assert all(isinstance(value, Decimal) for value in totals.values()), "every total should be a Decimal"
    assert totals["refunded"] == Decimal("0.30")


@test("Still reads a file without a byte order mark")
def _():
    plain = "status,order_id,amount\npaid,2001,10.00\npaid,2002,2.50\n"
    assert total_by_status(export(plain, "utf-8")) == {"paid": Decimal("12.50")}


@hidden("Ignores blank rows wherever they are")
def _():
    text = "status,order_id,amount\r\n,,\r\npending,3001,4.99\r\n,,\r\n"
    assert total_by_status(export(text, "utf-8-sig")) == {"pending": Decimal("4.99")}


@hidden("A header-only export gives no totals")
def _():
    assert total_by_status(export("status,order_id,amount\r\n", "utf-8-sig")) == {}
