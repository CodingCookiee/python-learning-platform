from decimal import Decimal

import pytest

from payroll import income_tax


@pytest.mark.parametrize(
    "income, tax",
    [
        pytest.param("12570", "0.00", id="top-of-allowance"),
        pytest.param("20000", "1486.00", id="inside-basic-band"),
        pytest.param("50270", "7540.00", id="top-of-basic-band"),
        pytest.param("60000", "11432.00", id="inside-higher-band"),
        pytest.param("125140", "37488.00", id="top-of-higher-band"),
        pytest.param("150000", "48675.00", id="inside-additional-band"),
        pytest.param("125140.10", "37488.05", id="half-a-penny-rounds-up"),
    ],
)
def test_income_tax(income, tax):
    assert income_tax(Decimal(income)) == Decimal(tax)
