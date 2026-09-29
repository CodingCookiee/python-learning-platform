from decimal import ROUND_HALF_UP, Decimal


def before_after(label, before, after, unit):
    """"Label: before → after unit (+N%)", with the bracket left off when before is 0."""
    line = f"{label}: {before} → {after} {unit}"
    if before == 0:
        return line
    change = (Decimal(after - before) / Decimal(before) * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return f"{line} ({int(change):+}%)"
