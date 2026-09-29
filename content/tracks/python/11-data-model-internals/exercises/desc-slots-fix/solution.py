import weakref


class Tick:
    """One price update from the market feed. Millions arrive a day, so it uses __slots__."""

    __slots__ = ("symbol", "price", "currency", "__weakref__")

    def __init__(self, symbol, price, currency="USD"):
        self.symbol = symbol
        self.price = price
        self.currency = currency


latest = weakref.WeakValueDictionary()


def record(tick):
    """Remember the latest tick for its symbol, without keeping old ticks alive."""
    latest[tick.symbol] = tick
    return tick
