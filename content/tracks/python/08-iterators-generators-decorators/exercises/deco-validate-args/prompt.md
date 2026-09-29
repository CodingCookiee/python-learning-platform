Bad amounts keep reaching the payment gateway. Write a decorator factory `validate(**checks)`,
where each keyword names a parameter of the decorated function and gives a check: a function that
takes the argument's value and returns `True` if it's acceptable.

- Before each call, every checked parameter's value is passed to its check, whether the caller
  passed it by position, by keyword, or left it at its default. If a check returns `False`, raise
  `ValueError` with the message `"<name>=<repr of value> failed <check's __name__>"`, and don't
  call the function.
- A check for a parameter the function doesn't have is a mistake in the code, not in the data:
  raise `TypeError` as soon as the function is decorated.
- The decorated function keeps its name and docstring, and returns what the original returns.

```python
def positive(value):
    return value > 0

def currency_code(value):
    return isinstance(value, str) and len(value) == 3 and value.isupper()

@validate(amount=positive, currency=currency_code)
def charge(customer_id, amount, currency="GBP"):
    return f"charged {amount:.2f} {currency} to {customer_id}"

charge("C1", 12.5)                   # "charged 12.50 GBP to C1"
charge("C1", -5)                     # ValueError: amount=-5 failed positive
charge("C1", 5, currency="pounds")   # ValueError: currency='pounds' failed currency_code
```
