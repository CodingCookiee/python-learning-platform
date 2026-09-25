class Order:
    status = "open"
    lines = []

    def __init__(self, customer):
        self.customer = customer

    def add_line(self, product, quantity, unit_price):
        self.lines.append((product, quantity, unit_price))

    def total(self):
        return sum(quantity * unit_price for _, quantity, unit_price in self.lines)

    def ship(self):
        self.status = "shipped"
