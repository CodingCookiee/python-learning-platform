A card authoriser reports failures by returning error codes. Every caller has to remember to check
the second value, and a new code means updating every `if` chain. Refactor it to raise exceptions:

- `PaymentError(Exception)` is the base class.
- `InvalidAmount(PaymentError, ValueError)`, raised with `"amount must be above zero"`.
- `CardBlocked(PaymentError)`, raised with `"card <card> is blocked"`.
- `LimitExceeded(PaymentError)`, created as `LimitExceeded(limit)`: it stores `limit` as an
  attribute, and its message is `"over the limit of <limit>"`.
- `authorise(payment, limits)` returns the authorisation code on success (a string, not a tuple),
  and raises one of the exceptions above otherwise.
- `checkout(payment, limits)` returns exactly the same text as before, in every case.

```python
limits = {"max_amount": 500, "blocked": {"4000-0000"}}
authorise({"id": "P-7", "card": "4242-4242", "amount": 120}, limits)   # "AUTH-P-7"
authorise({"id": "P-8", "card": "4000-0000", "amount": 20}, limits)    # raises CardBlocked
checkout({"id": "P-9", "card": "4242-4242", "amount": 900}, limits)    # "The limit is 500"
```

No error-code strings (`"INVALID_AMOUNT"` and friends) should be left in the code.
