The library team wrote the tests first. Here they are, all red, because `late_fee` doesn't do
anything yet:

```python
# test_late_fees.py
from decimal import Decimal

import pytest

from late_fees import late_fee


def test_no_fee_when_returned_on_time():
    assert late_fee(0) == Decimal("0.00")


def test_no_fee_within_the_two_day_grace_period():
    assert late_fee(2) == Decimal("0.00")


def test_charges_50p_for_every_day_once_past_the_grace_period():
    assert late_fee(3) == Decimal("1.50")


@pytest.mark.parametrize("days, fee", [(10, "5.00"), (30, "15.00"), (31, "15.00"), (365, "15.00")])
def test_fee_is_capped_at_15(days, fee):
    assert late_fee(days) == Decimal(fee)


def test_negative_days_are_an_error():
    with pytest.raises(ValueError, match="days_late"):
        late_fee(-1)
```

Write `late_fee(days_late)` in `late_fees.py` (the editor) and make them green. Work the way
TDD does: make the first test pass in the simplest way, then the next, tidying up as you go.
Your code is graded by running exactly these tests with pytest, plus a few more checks of the same
rules.
