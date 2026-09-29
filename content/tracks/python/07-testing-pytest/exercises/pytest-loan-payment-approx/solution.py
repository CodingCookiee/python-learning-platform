import pytest

from loans import monthly_payment


def test_twelve_month_loan_at_six_percent():
    assert monthly_payment(10_000, 0.06, 12) == pytest.approx(860.66, abs=0.01)


def test_longer_loans_have_smaller_payments():
    assert monthly_payment(10_000, 0.06, 24) == pytest.approx(443.21, abs=0.01)


def test_interest_free_loan_splits_the_principal_evenly():
    assert monthly_payment(1_200, 0, 12) == pytest.approx(100)
