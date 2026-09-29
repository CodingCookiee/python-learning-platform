from decimal import Decimal

from invoice import invoice_total


def test_discount_comes_off_before_vat():
    totals = invoice_total([("Desk", 1, Decimal("100.00"))], discount_percent=10)
    assert totals == {
        "subtotal": Decimal("100.00"),
        "discount": Decimal("10.00"),
        "vat": Decimal("18.00"),
        "total": Decimal("108.00"),
    }


def test_quantities_multiply_the_unit_price():
    totals = invoice_total([("Chair", 4, Decimal("45.00")), ("Lamp", 1, Decimal("30.00"))])
    assert totals["subtotal"] == Decimal("210.00")
    assert totals["total"] == Decimal("252.00")


def test_discount_is_rounded_half_up_to_the_penny():
    totals = invoice_total([("Notebook", 1, Decimal("19.99"))], discount_percent=15)
    assert totals["discount"] == Decimal("3.00")
