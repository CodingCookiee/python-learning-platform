import pytest

from config import payments_mode


def test_live_mode_can_be_switched_on(monkeypatch):
    monkeypatch.setenv("PAYMENTS_MODE", "live")
    assert payments_mode() == "live"


def test_defaults_to_sandbox_when_unset(monkeypatch):
    monkeypatch.delenv("PAYMENTS_MODE", raising=False)
    assert payments_mode() == "sandbox"


def test_ignores_case_and_spaces(monkeypatch):
    monkeypatch.setenv("PAYMENTS_MODE", " LIVE ")
    assert payments_mode() == "live"


def test_a_typo_is_refused(monkeypatch):
    monkeypatch.setenv("PAYMENTS_MODE", "lvie")
    with pytest.raises(ValueError, match="lvie"):
        payments_mode()
