class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    def __repr__(self):
        return f"Money({self.amount!r}, {self.currency!r})"

    def __eq__(self, other):
        return self.amount == other.amount and self.currency == other.currency


def unique_prices(prices):
    """The distinct prices, in the order they first appear."""
    return list(dict.fromkeys(prices))
