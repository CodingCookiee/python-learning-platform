from refunds import refund_amount


def test_refund_is_full_within_two_weeks():
    assert refund_amount(2000, 3) == 2000


class TestLateRefunds:
    def test_half_refund_within_a_month(self):
        paid = 2000
        assert refund_amount(paid, 20) == 1000


def test_no_refund_after_a_month():
    assert refund_amount(2000, 45) == 0


def test_day_fourteen_is_still_a_full_refund():
    assert refund_amount(2000, 14) == 2000
