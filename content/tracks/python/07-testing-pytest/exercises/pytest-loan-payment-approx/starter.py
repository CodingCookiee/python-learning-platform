import pytest

from loans import monthly_payment


def test_twelve_month_loan_at_six_percent():
    assert monthly_payment(10_000, 0.06, 12) > 0
