A customer has reported a bug:

> I typed my coupon code as `save10` and checkout said it wasn't valid. Typing `SAVE10` worked.

Here's the code as it is now:

```python
# coupons.py
COUPONS = {"SAVE10": 10, "SPRING25": 25}


def discount_percent(code):
    """The percentage off for a coupon code, or 0 if the code isn't valid.

    Codes aren't case-sensitive, and spaces around them are ignored.
    """
    return COUPONS.get(code.strip(), 0)
```

Before anyone fixes it, write the test that reproduces it. Your `test_coupons.py` is graded
three ways:

1. **Red:** against the current code above, at least one of your tests must fail.
2. **Green:** against the fixed code, every test must pass.
3. **Still right:** your tests must catch a careless "fix" that breaks something else.
