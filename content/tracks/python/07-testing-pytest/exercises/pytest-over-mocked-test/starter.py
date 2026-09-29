from decimal import Decimal
from unittest.mock import patch

import invoice


def test_invoice_total_uses_the_helpers():
    with patch("invoice._subtotal", return_value=Decimal("100.00")) as subtotal:
        with patch("invoice._discount", return_value=Decimal("10.00")) as discount:
            result = invoice.invoice_total([("Desk", 1, Decimal("100.00"))], discount_percent=10)
    subtotal.assert_called_once()
    discount.assert_called_once_with(Decimal("100.00"), 10)
    assert result["total"] == Decimal("108.00")
