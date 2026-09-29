import pytest

from shipping import shipping_band


@pytest.mark.parametrize(
    "weight_kg, band",
    [
        (0.5, "small"),
        # add cases here
    ],
)
def test_shipping_band(weight_kg, band):
    assert shipping_band(weight_kg) == band
