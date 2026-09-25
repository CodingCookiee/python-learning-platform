"""Receipt printer: the capstone for module 1, Python for developers.

Run it with `python receipt.py` (or `uv run receipt.py`). Type one item per line as
"name, quantity, unit price", then press Enter on an empty line to print the receipt.
"""

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

TAX_RATE = Decimal("0.08")
CENT = Decimal("0.01")

NAME_WIDTH = 20
QTY_WIDTH = 4
TOTAL_WIDTH = 10
WIDTH = NAME_WIDTH + QTY_WIDTH + TOTAL_WIDTH


def format_row(name, quantity, line_total):
    """Return one item row, WIDTH characters long: name, quantity, line total."""
    # TODO: one f-string with three fixed-width columns (lesson 4, "Format specs").
    # Tip: a width can come from a constant: f"{name:<{NAME_WIDTH}}"
    return ""


def format_total(label, amount):
    """Return a totals row, WIDTH characters long: label on the left, amount on the right."""
    # TODO
    return ""


if __name__ == "__main__":
    rows = ""                  # the item rows so far, one per line
    subtotal = Decimal("0")

    print('Enter items as "name, quantity, unit price". Leave a line blank to finish.')
    while True:
        line = input("> ")
        if not line.strip():
            break              # a blank line: stop reading
        elif line.count(",") != 2:
            print(f'Skipped "{line}": expected name, quantity, unit price')
        else:
            # TODO: split the line into its three parts and strip each one.
            # TODO: check the quantity and the price. If either is bad, print why.
            #       Otherwise add the item's row to rows, and its line total to subtotal.
            pass

    # TODO: if there were no valid items, print "No items entered."
    # TODO: otherwise work out the tax and the total, then print the receipt.
