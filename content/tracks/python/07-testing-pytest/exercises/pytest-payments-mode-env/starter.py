import pytest

from config import payments_mode


def test_live_mode_can_be_switched_on(monkeypatch):
    monkeypatch.setenv("PAYMENTS_MODE", "live")
    assert payments_mode() == "live"


# Test the default, the case and spaces, and a typo
