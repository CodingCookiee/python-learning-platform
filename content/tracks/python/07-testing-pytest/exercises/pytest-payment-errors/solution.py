from datetime import date

import pytest

from gateway import Card, CardDeclined, CardExpired, authorize

SEPT_30 = date(2026, 9, 30)


@pytest.fixture
def card():
    return Card("4000056655665556", 2026, 9, limit_pence=50_000)


def test_authorizes_a_valid_payment(card):
    assert authorize(card, 1999, today=date(2026, 9, 1)) == "AUTH-5556-1999"


def test_card_works_until_the_end_of_its_expiry_month(card):
    assert authorize(card, 1999, today=SEPT_30) == "AUTH-5556-1999"


def test_card_expires_after_its_expiry_month(card):
    with pytest.raises(CardExpired, match="expired 09/2026"):
        authorize(card, 1999, today=date(2026, 10, 1))


def test_a_charge_of_exactly_the_limit_is_allowed(card):
    assert authorize(card, 50_000, today=SEPT_30) == "AUTH-5556-50000"


def test_a_charge_over_the_limit_is_declined(card):
    with pytest.raises(CardDeclined) as excinfo:
        authorize(card, 50_001, today=SEPT_30)
    assert excinfo.value.code == "limit_exceeded"


def test_a_zero_charge_is_declined_as_invalid(card):
    with pytest.raises(CardDeclined) as excinfo:
        authorize(card, 0, today=SEPT_30)
    assert excinfo.value.code == "invalid_amount"
