import pytest

from subscriptions import Subscription


@pytest.fixture
def basic():
    return Subscription("basic")


def test_basic_plan_costs_9_a_month(basic):
    assert basic.monthly_price() == 900


def test_billing_records_an_invoice(basic):
    amount = basic.bill()

    assert amount == 900
    assert basic.invoices == [900]


def test_changing_plan_changes_what_is_billed(basic):
    basic.change_plan("pro")

    assert basic.bill() == 2900


def test_an_unknown_plan_is_refused(basic):
    with pytest.raises(ValueError, match="unknown plan"):
        basic.change_plan("enterprise")


def test_a_cancelled_subscription_is_not_billed(basic):
    basic.cancel()

    assert basic.bill() is None
    assert basic.invoices == []


def test_a_cancelled_subscription_cannot_change_plan(basic):
    basic.cancel()

    with pytest.raises(ValueError, match="cancelled"):
        basic.change_plan("team")
