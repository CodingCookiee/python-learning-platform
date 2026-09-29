from datetime import date

import pytest

from gateway import Card, CardDeclined, CardExpired, authorize


def test_authorizes_a_valid_payment():
    card = Card("4000056655665556", 2026, 9, limit_pence=50_000)
    assert authorize(card, 1999, today=date(2026, 9, 1)) == "AUTH-5556-1999"
