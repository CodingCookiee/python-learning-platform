import pytest

from refunds import refund


def test_partial_refund_leaves_the_rest():
    assert refund(2000, 500) == 1500


# Test the refunds that must be refused, with pytest.raises
