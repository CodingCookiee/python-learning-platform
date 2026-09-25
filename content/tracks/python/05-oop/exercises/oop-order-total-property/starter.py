class Order:
    def __init__(self, lines):
        self.lines = lines   # [(product, quantity, unit_price), ...]

    def total(self):
        ...

    def item_count(self):
        ...
