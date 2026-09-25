class Product:
    def __init__(self, name, price, stock=0):
        self.name = name
        self.price = price
        self.stock = stock

    @property
    def price(self):
        return self._price

    @price.setter
    def price(self, value):
        if value < 0:
            raise ValueError(f"Price can't be negative: {value}")
        self._price = round(value, 2)

    @property
    def stock(self):
        return self._stock

    @stock.setter
    def stock(self, value):
        if not isinstance(value, int) or value < 0:
            raise ValueError(f"Stock must be a whole number of 0 or more: {value!r}")
        self._stock = value

    @property
    def in_stock(self):
        return self.stock > 0
