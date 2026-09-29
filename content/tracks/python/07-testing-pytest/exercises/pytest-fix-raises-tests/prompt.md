A prepaid wallet refuses bad charges:

```python
# wallet.py
class Wallet:
    """A prepaid wallet. Balances and charges are in pence."""

    def __init__(self, balance):
        self.balance = balance

    def charge(self, amount):
        if amount <= 0:
            raise ValueError(f"amount must be > 0 (got {amount})")
        if amount > self.balance:
            raise ValueError(f"insufficient funds: balance {self.balance}, charge {amount}")
        self.balance -= amount
```

Its tests have three problems. One of them fails on this correct code, and two of them can never
fail, whatever the wallet does:

- `test_refuses_a_negative_amount` fails even though the wallet is right.
- `test_refused_charge_leaves_the_balance_alone` never checks the balance.
- `test_refuses_to_overdraw` passes even if the charge goes through.

Fix `test_wallet.py` so that each test checks what its name says. Keep all four tests. They're
graded against the code above and against copies with bugs planted in it.
