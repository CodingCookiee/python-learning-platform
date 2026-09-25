class Money:
    def __init__(self, amount, currency):
        self.amount = amount
        self.currency = currency

    @staticmethod
    def is_currency_code(code):
        """True if code is exactly three uppercase letters."""
        return len(code) == 3 and code.isalpha() and code.isupper()

    @classmethod
    def from_string(cls, text):
        """Build Money from text like "12.50 EUR"."""
        amount, currency = text.split()
        currency = currency.upper()
        if not cls.is_currency_code(currency):
            raise ValueError(f"Not a currency code: {currency!r}")
        return cls(float(amount), currency)

    @classmethod
    def from_cents(cls, cents, currency):
        """Build Money from a whole number of cents."""
        return cls(cents / 100, currency)
