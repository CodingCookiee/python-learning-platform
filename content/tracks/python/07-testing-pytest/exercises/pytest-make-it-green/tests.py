import re
from decimal import Decimal
from functools import cache

from plp import hidden, pytest_run, solution_source, test
from solution import late_fee

SPEC = '''
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
'''


@cache
def spec_run():
    """The team's tests, run with pytest against the learner's late_fees.py."""
    return pytest_run({"late_fees.py": solution_source(), "test_late_fees.py": SPEC})


def explain(names):
    """pytest's E lines for the named tests that didn't pass."""
    result = spec_run()
    out, heading, shown = [], None, 0
    for line in result.output.splitlines():
        match = re.fullmatch(r"_{2,} (.+?) _{2,}", line)
        if match:
            heading, shown = match.group(1), 0
        elif line.startswith("E ") and heading and heading.split("[")[0] in names and shown < 2:
            if shown == 0:
                out.append(heading + ":")
            out.append("    " + line[1:].strip().removeprefix("AssertionError: "))
            shown += 1
        elif "short test summary" in line:
            break
    return "\n".join(out[:12])


def still_red(*names):
    """The named spec tests (and their parametrized cases) that didn't pass."""
    result = spec_run()
    return [name for name in result.failed + result.errors if name.split("[")[0] in names]


@test("The grace period: no fee for up to 2 days late")
def _():
    names = ("test_no_fee_when_returned_on_time", "test_no_fee_within_the_two_day_grace_period")
    assert still_red(*names) == [], "Still red:\n" + explain(names)


@test("50p for every day once past the grace period")
def _():
    names = ("test_charges_50p_for_every_day_once_past_the_grace_period",)
    assert still_red(*names) == [], "Still red:\n" + explain(names)


@test("The fee is capped at 15.00")
def _():
    names = ("test_fee_is_capped_at_15",)
    assert still_red(*names) == [], "Still red:\n" + explain(names)


@test("Negative days raise ValueError")
def _():
    names = ("test_negative_days_are_an_error",)
    assert still_red(*names) == [], "Still red:\n" + explain(names)


@hidden("The daily rate applies between the grace period and the cap")
def _():
    assert late_fee(1) == Decimal("0.00")
    assert late_fee(4) == Decimal("2.00")
    assert late_fee(29) == Decimal("14.50")


@hidden("Returns a Decimal, never a float")
def _():
    assert isinstance(late_fee(3), Decimal), "late_fee should return a Decimal"
    assert isinstance(late_fee(0), Decimal), "late_fee should return a Decimal for 0 days too"
