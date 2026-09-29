class TaxRate:
    """A named tax rate. Calling it on an amount returns the amount with tax, to 2 decimals."""

    def __init__(self, name, percent):
        self.name = name
        self.percent = percent
