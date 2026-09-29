Prices arrive from a supplier's feed as text like `"12.50 EUR"`. Write `parse_money(text)` that
returns a tuple of the amount as a `Decimal` and the currency code:

```python
parse_money("12.50 EUR")      # (Decimal("12.50"), "EUR")
parse_money("  1200 JPY ")    # (Decimal("1200"), "JPY")
parse_money("12.50")          # ValueError: not a money amount: '12.50'
parse_money("twelve EUR")     # ValueError: not a money amount: 'twelve EUR'
```

The text must be an amount and a currency separated by whitespace, nothing more. The amount is any
finite decimal number (`Decimal` also accepts `"NaN"` and `"Infinity"`; refuse those). The currency
is exactly three uppercase letters, A to Z.

Every problem raises `ValueError` with the message `not a money amount: '<text>'`. Whatever Python
raised internally (a failed unpacking, or `decimal.InvalidOperation`, which isn't a `ValueError`)
is an implementation detail: callers should see only your error, with no chained exception in the
traceback.
