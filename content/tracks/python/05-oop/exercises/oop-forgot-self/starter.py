class Cart:
    def __init__(self, owner):
        owner = owner
        items = []

    def add(self, name, price):
        self.items.append((name, price))

    def total():
        return sum(price for _, price in self.items)
