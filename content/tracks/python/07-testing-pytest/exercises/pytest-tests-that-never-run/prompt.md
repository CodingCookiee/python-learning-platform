This test file has been in the repository for a year, and pytest reports it as green on every
run. It isn't testing much: every one of its four tests has a mistake that means it either never
runs or can never fail.

```python
# refunds.py
def refund_amount(paid_pence, days_since_purchase):
    """How much of a purchase to refund, in pence.

    A full refund up to and including day 14, half (rounded down to the penny)
    up to and including day 30, and nothing after that.
    """
    if days_since_purchase <= 14:
        return paid_pence
    if days_since_purchase <= 30:
        return paid_pence // 2
    return 0
```

Fix `test_refunds.py` so that all four tests are collected and each one really checks what its
name says. Keep the four behaviours; you can rename or restructure the tests. They're graded
against the code above and against copies with a bug planted in each refund rule.
