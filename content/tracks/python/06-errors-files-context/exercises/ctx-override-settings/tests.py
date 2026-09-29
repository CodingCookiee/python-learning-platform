from plp import test, hidden, raises, source_uses
from solution import override


@test("Overrides settings inside the block and restores them after")
def _():
    settings = {"currency": "EUR", "tax_rate": 0.2}
    with override(settings, currency="GBP", sandbox=True) as active:
        assert active is settings, "as should give you the settings dict itself"
        assert active["currency"] == "GBP"
        assert active["sandbox"] is True
    assert settings == {"currency": "EUR", "tax_rate": 0.2}


@test("Restores the settings when the block raises, and lets the error through")
def _():
    settings = {"currency": "EUR", "tax_rate": 0.2}
    with raises(ConnectionError, match="sandbox unreachable"):
        with override(settings, currency="USD", sandbox=True):
            raise ConnectionError("sandbox unreachable")
    assert settings == {"currency": "EUR", "tax_rate": 0.2}


@test("Is written with @contextmanager")
def _():
    assert source_uses(name="contextmanager"), "Decorate override with @contextmanager from contextlib"


@hidden("Only the overridden keys are restored")
def _():
    settings = {"currency": "EUR", "tax_rate": 0.2}
    with override(settings, currency="GBP"):
        settings["tax_rate"] = 0.0
    assert settings == {"currency": "EUR", "tax_rate": 0.0}


@hidden("Restores a setting whose old value was None")
def _():
    settings = {"coupon": None}
    with override(settings, coupon="WELCOME10"):
        assert settings["coupon"] == "WELCOME10"
    assert settings == {"coupon": None}


@hidden("Copes with the block deleting an overridden key")
def _():
    settings = {"currency": "EUR"}
    with override(settings, currency="GBP", sandbox=True):
        del settings["sandbox"]
        del settings["currency"]
    assert settings == {"currency": "EUR"}


@hidden("Overriding nothing changes nothing")
def _():
    settings = {"currency": "EUR"}
    with override(settings) as active:
        assert active == {"currency": "EUR"}
    assert settings == {"currency": "EUR"}
