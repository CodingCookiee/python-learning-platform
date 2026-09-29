from decimal import Decimal

import pytest

from payroll import income_tax


@pytest.mark.parametrize(
    "income, tax",
    [
        ("20000", "1486.00"),
    ],
    ids=["inside-basic-band"],
)
def test_income_tax(income, tax):
    assert income_tax(Decimal(income)) == Decimal(tax)
