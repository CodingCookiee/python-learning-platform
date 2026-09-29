import pytest

from subscriptions import Subscription


def test_subscription():
    subscription = Subscription("basic")
    assert subscription.monthly_price() == 900
    assert subscription.bill() == 900
    assert subscription.invoices == [900]
    subscription.change_plan("pro")
    assert subscription.bill() == 2900
    with pytest.raises(ValueError):
        subscription.change_plan("enterprise")
    subscription.cancel()
    assert subscription.bill() is None
    assert subscription.invoices == [900, 2900]
    with pytest.raises(ValueError):
        subscription.change_plan("team")
