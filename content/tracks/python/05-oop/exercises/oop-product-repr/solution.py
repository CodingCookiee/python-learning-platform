class Product:
    def __init__(self, sku, name, price):
        self.sku = sku
        self.name = name
        self.price = price

    def __repr__(self):
        return f"Product({self.sku!r}, {self.name!r}, {self.price!r})"

    def __str__(self):
        return f"{self.name} ({self.sku}) at {self.price:.2f}"
