class Order:
    def __init__(self, number):
        self.number = number
        self.lines = []

    def add_line(self, sku, quantity, unit_price):
        line = OrderLine(self, sku, quantity, unit_price)
        self.lines.append(line)
        return line

    def total(self):
        return round(sum(line.total for line in self.lines), 2)


class OrderLine:
    def __init__(self, order, sku, quantity, unit_price):
        self.order = order
        self.sku = sku
        self.quantity = quantity
        self.unit_price = unit_price

    @property
    def total(self):
        return round(self.quantity * self.unit_price, 2)
