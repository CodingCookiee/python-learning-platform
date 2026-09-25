class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    def is_currency_code(code):
        """True if code is exactly three uppercase letters."""
        ...

    def from_string(text):
        """Build Money from text like "12.50 EUR"."""
        ...

    def from_cents(cents, currency):
        """Build Money from a whole number of cents."""
        ...
