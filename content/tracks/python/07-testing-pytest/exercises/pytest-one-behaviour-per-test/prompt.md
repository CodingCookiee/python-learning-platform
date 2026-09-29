Subscriptions are billed monthly:

```python
# subscriptions.py
PLANS = {"basic": 900, "pro": 2900, "team": 7900}  # pence a month


class Subscription:
    def __init__(self, plan):
        if plan not in PLANS:
            raise ValueError(f"unknown plan: {plan}")
        self.plan = plan
        self.active = True
        self.invoices = []

    def monthly_price(self):
        return PLANS[self.plan]

    def change_plan(self, plan):
        if not self.active:
            raise ValueError("can't change the plan of a cancelled subscription")
        if plan not in PLANS:
            raise ValueError(f"unknown plan: {plan}")
        self.plan = plan

    def cancel(self):
        self.active = False

    def bill(self):
        """Record this month's invoice and return its amount, or None once cancelled."""
        if not self.active:
            return None
        amount = self.monthly_price()
        self.invoices.append(amount)
        return amount
```

Its only test, `test_subscription`, checks everything in one long sequence. When it fails, the
report says `test_subscription FAILED` and nothing else, and the first failure hides any others.

Refactor `test_subscription.py` into **at least five** focused tests, one behaviour each, named
after what they check (`test_a_cancelled_subscription_is_not_billed`). Each test arranges its own
subscription, does one thing, and makes no more than three checks (an `assert` or a
`pytest.raises` block each). The refactored tests must still pass on the code above and catch every
bug the original test catches.
