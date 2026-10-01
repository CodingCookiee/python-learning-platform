"""Receipt printer: the capstone for module 1, Python for developers (reference solution)."""

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

TAX_RATE = Decimal("0.08")
CENT = Decimal("0.01")

NAME_WIDTH = 20
QTY_WIDTH = 4
TOTAL_WIDTH = 10
WIDTH = NAME_WIDTH + QTY_WIDTH + TOTAL_WIDTH


def format_row(name, quantity, line_total):
    """Return one item row, WIDTH characters long: name, quantity, line total."""
    return f"{name[:NAME_WIDTH]:<{NAME_WIDTH}}{quantity:>{QTY_WIDTH}}{line_total:>{TOTAL_WIDTH}.2f}"


def format_total(label, amount):
    """Return a totals row, WIDTH characters long: label on the left, amount on the right."""
    return f"{label:<{NAME_WIDTH + QTY_WIDTH}}{amount:>{TOTAL_WIDTH}.2f}"


def parse_quantity(text):
    """The quantity as an int of 1 or more, or None."""
    return int(text) if text.isdigit() and int(text) >= 1 else None


def parse_price(text):
    """The unit price as a Decimal, or None."""
    try:
        price = Decimal(text)
    except InvalidOperation:
        return None
    return price if price.is_finite() else None


if __name__ == "__main__":
    rows = ""
    subtotal = Decimal("0")

    print('Enter items as "name, quantity, unit price". Leave a line blank to finish.')
    while True:
        line = input("> ")
        if not line.strip():
            break
        if line.count(",") != 2:
            print(f'Skipped "{line}": expected name, quantity, unit price')
            continue
        name, quantity_text, price_text = (part.strip() for part in line.split(","))
        quantity = parse_quantity(quantity_text)
        if quantity is None:
            print(f'Skipped "{line}": quantity must be a whole number')
            continue
        price = parse_price(price_text)
        if price is None:
            print(f'Skipped "{line}": unit price must be a number like 2.40')
            continue
        line_total = quantity * price
        rows += format_row(name, quantity, line_total) + "\n"
        subtotal += line_total

    if not rows:
        print("No items entered.")
    else:
        tax = (subtotal * TAX_RATE).quantize(CENT, rounding=ROUND_HALF_UP)
        rule = "-" * WIDTH
        print()
        print(f"{'Item':<{NAME_WIDTH}}{'Qty':>{QTY_WIDTH}}{'Total':>{TOTAL_WIDTH}}")
        print(rule)
        print(rows, end="")
        print(rule)
        print(format_total("Subtotal", subtotal))
        print(format_total("Tax (8%)", tax))
        print(format_total("Total", subtotal + tax))
