class TaxRate:
    """A named tax rate. Calling it on an amount returns the amount with tax, to 2 decimals."""

    def __init__(self, name, percent):
        self.name = name
        self.percent = percent

    def __repr__(self):
        return f"TaxRate({self.name!r}, {self.percent!r})"

    def __call__(self, amount):
        return round(amount * (100 + self.percent) / 100, 2)
