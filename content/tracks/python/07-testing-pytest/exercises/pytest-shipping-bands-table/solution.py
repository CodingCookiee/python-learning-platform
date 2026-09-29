import pytest

from shipping import shipping_band


@pytest.mark.parametrize(
    "weight_kg, band",
    [
        (0.5, "small"),
        (2, "small"),
        (2.01, "medium"),
        (10, "medium"),
        (10.01, "large"),
        (25, "large"),
    ],
)
def test_shipping_band(weight_kg, band):
    assert shipping_band(weight_kg) == band
