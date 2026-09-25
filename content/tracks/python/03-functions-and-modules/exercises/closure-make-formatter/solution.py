def make_formatter(symbol, *, decimals=2):
    """Return a function that formats an amount as money, e.g. "£1,234.50"."""

    def format_amount(amount):
        sign = "-" if amount < 0 else ""
        return f"{sign}{symbol}{abs(amount):,.{decimals}f}"

    return format_amount
