`invoice_total` used to call two private helpers, `_subtotal()` and `_discount()`. A colleague
merged them into the function during a clean-up. Every invoice comes out exactly as before:

```python
# invoice.py
from decimal import ROUND_HALF_UP, Decimal

VAT_RATE = Decimal("0.20")
PENNY = Decimal("0.01")


def invoice_total(lines, discount_percent=0):
    """Totals for an invoice of (description, quantity, unit_price) lines, with Decimal prices.

    The discount is taken off the subtotal, and VAT is charged on what's left.
    Every amount is rounded half-up to the penny.
    """
    subtotal = sum((quantity * price for _, quantity, price in lines), Decimal("0"))
    discount = (subtotal * discount_percent / 100).quantize(PENNY, rounding=ROUND_HALF_UP)
    vat = ((subtotal - discount) * VAT_RATE).quantize(PENNY, rounding=ROUND_HALF_UP)
    return {"subtotal": subtotal, "discount": discount, "vat": vat, "total": subtotal - discount + vat}
```

```python
invoice_total([("Desk", 1, Decimal("100.00"))], discount_percent=10)
# {'subtotal': Decimal('100.00'), 'discount': Decimal('10.00'), 'vat': Decimal('18.00'), 'total': Decimal('108.00')}
```

The old test now fails with `AttributeError: <module 'invoice'> does not have the attribute
'_subtotal'`, although nothing a caller sees has changed. It was testing how `invoice_total` was
written, not what it does.

Replace it in `test_invoice.py` with tests of the behaviour: call `invoice_total` with real lines
and check the amounts it returns. Use no mocks or patching. Your tests must pass on the code above
and catch the bugs planted in copies of it.
