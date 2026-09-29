import pytest

from refunds import refund


def test_partial_refund_leaves_the_rest():
    assert refund(2000, 500) == 1500


def test_full_refund_is_allowed():
    assert refund(2000, 2000) == 0


def test_zero_refund_is_refused():
    with pytest.raises(ValueError, match="must be positive"):
        refund(2000, 0)


def test_refund_larger_than_the_order_is_refused():
    with pytest.raises(ValueError, match="can't refund"):
        refund(2000, 2001)
