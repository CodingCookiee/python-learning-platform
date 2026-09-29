The till prints receipts:

```python
# receipt.py
from decimal import Decimal


def print_receipt(lines):
    """Print a receipt for (name, quantity, unit_price) lines, with Decimal prices.

    Each line shows the quantity, the name and the line total, and the last line
    is the total. An empty receipt prints just "No items".
    """
    if not lines:
        print("No items")
        return
    total = Decimal("0")
    for name, quantity, unit_price in lines:
        line_total = quantity * unit_price
        total += line_total
        print(f"{quantity} x {name:<16}{line_total:>8.2f}")
    print(f"Total: {total:.2f}")
```

```python
print_receipt([("Mug", 2, Decimal("8.00")), ("Tea", 1, Decimal("3.50"))])
```

```text
2 x Mug                16.00
1 x Tea                 3.50
Total: 19.50
```

Write `test_receipt.py`, using the `capsys` fixture to check what `print_receipt` prints. Your
tests must pass on this code and catch the bugs planted in copies of it.
