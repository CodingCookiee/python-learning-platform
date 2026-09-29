The lending team's repayment calculator works in floats:

```python
# loans.py
def monthly_payment(principal, annual_rate, months):
    """The fixed monthly repayment on a loan, in pounds.

    annual_rate is a fraction (0.06 for 6% a year), charged monthly. With a rate
    of 0 the principal is simply split evenly over the months.
    """
    if annual_rate == 0:
        return principal / months
    monthly_rate = annual_rate / 12
    return principal * monthly_rate / (1 - (1 + monthly_rate) ** -months)
```

```python
monthly_payment(10_000, 0.06, 12)   # 860.664...
monthly_payment(1_200, 0, 12)       # 100.0
```

Write `test_loans.py`, comparing the results with `pytest.approx`. A tolerance of a penny
(`abs=0.01`) is a good choice for amounts of money that come out of float arithmetic. Your tests
must pass on this code and catch the bugs planted in copies of it.
