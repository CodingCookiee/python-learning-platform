A prepaid wallet refuses payments it can't cover, but it raises a bare `ValueError("not enough
money")`, so the checkout can't offer "top up 30.00" without parsing the message. Give it proper
exceptions:

- `InsufficientFunds(balance, amount)` is a `PaymentError`. It stores `balance` and `amount` as
  attributes, has a `shortfall` attribute (`amount - balance`), and its message is
  `"balance <balance> is <shortfall> short of <amount>"`.
- `InvalidAmount` is both a `PaymentError` and a `ValueError`.
- `Wallet.pay(amount)` raises `InvalidAmount("amount must be more than zero, got <amount>")` for an
  amount of zero or less, and `InsufficientFunds` for an amount above the balance. A refused
  payment leaves the balance unchanged.

```python
wallet = Wallet(Decimal("20.00"))
wallet.pay(Decimal("50.00"))
# InsufficientFunds: balance 20.00 is 30.00 short of 50.00
# error.balance == Decimal("20.00"), error.amount == Decimal("50.00"), error.shortfall == Decimal("30.00")
wallet.pay(Decimal("5.00"))     # Decimal("15.00")
wallet.pay(Decimal("0"))        # InvalidAmount: amount must be more than zero, got 0
```
