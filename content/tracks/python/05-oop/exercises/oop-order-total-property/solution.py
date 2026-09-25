class Order:
    def __init__(self, lines):
        self.lines = lines   # [(product, quantity, unit_price), ...]

    @property
    def total(self):
        return sum(quantity * price for _, quantity, price in self.lines)

    @property
    def item_count(self):
        return sum(quantity for _, quantity, _ in self.lines)
