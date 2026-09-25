Payment data arrives as text from CSV exports and as whole cents from the card processor. Give
`Money` a constructor for each, plus a helper to check currency codes.

- `Money(amount, currency)` stores both. It's written for you.
- `Money.is_currency_code(code)` returns `True` if `code` is exactly three uppercase letters.
- `Money.from_string(text)` parses `"12.50 EUR"`: an amount and a currency, separated by spaces.
  Lowercase currencies are accepted and uppercased. Raise `ValueError` if the result isn't a
  currency code.
- `Money.from_cents(cents, currency)` turns `1250` into an amount of `12.5`.

```python
price = Money.from_string("12.50 eur")
price.amount, price.currency       # (12.5, "EUR")
Money.from_cents(1250, "EUR").amount   # 12.5
Money.is_currency_code("GBP")      # True
Money.from_string("12.50 euro")    # ValueError
```

Both constructors must also work for subclasses: `Price.from_string("9.99 GBP")` returns a `Price`
when `Price` is a subclass of `Money`.
