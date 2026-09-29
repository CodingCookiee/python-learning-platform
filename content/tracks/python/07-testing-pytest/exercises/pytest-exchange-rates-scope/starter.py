from decimal import Decimal

import pytest

from rates import convert, load_rates


@pytest.fixture
def rates():
    return load_rates()


def test_converting_to_the_same_currency_changes_nothing(rates):
    assert convert(Decimal("19.99"), "GBP", "GBP", rates) == Decimal("19.99")
