from decimal import Decimal

import pytest

from rates import convert, load_rates


@pytest.fixture(scope="module")
def rates():
    return load_rates()


def test_converting_to_the_same_currency_changes_nothing(rates):
    assert convert(Decimal("19.99"), "GBP", "GBP", rates) == Decimal("19.99")


def test_converts_through_the_euro(rates):
    assert convert(Decimal("100.00"), "GBP", "USD", rates) == Decimal("127.65")


def test_converts_euros_to_yen(rates):
    assert convert(Decimal("10.00"), "EUR", "JPY", rates) == Decimal("1624.00")


def test_rounds_half_a_cent_up(rates):
    # 5000 JPY is 30.7881… euros
    assert convert(Decimal("5000"), "JPY", "EUR", rates) == Decimal("30.79")
