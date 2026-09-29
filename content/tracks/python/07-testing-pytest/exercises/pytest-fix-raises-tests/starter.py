import pytest

from wallet import Wallet


def test_charge_reduces_the_balance():
    wallet = Wallet(1000)
    wallet.charge(250)
    assert wallet.balance == 750


def test_refuses_a_negative_amount():
    with pytest.raises(ValueError, match="amount must be > 0 (got -5)"):
        Wallet(1000).charge(-5)


def test_refused_charge_leaves_the_balance_alone():
    wallet = Wallet(100)
    with pytest.raises(ValueError):
        wallet.charge(500)
        assert wallet.balance == 100


def test_refuses_to_overdraw():
    try:
        Wallet(100).charge(500)
    except ValueError:
        pass
