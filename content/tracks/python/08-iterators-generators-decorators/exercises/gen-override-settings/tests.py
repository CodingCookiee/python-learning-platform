import inspect

from plp import test, hidden
from solution import override


@test("Changes settings inside the block and restores them after")
def _():
    settings = {"currency": "GBP", "rate_limit": 100}
    with override(settings, currency="EUR", sandbox=True) as active:
        assert active is settings, "the with ... as target should be the settings dict itself"
        assert settings == {"currency": "EUR", "rate_limit": 100, "sandbox": True}
    assert settings == {"currency": "GBP", "rate_limit": 100}


@test("Restores the settings when the block raises, and the error still gets out")
def _():
    settings = {"currency": "GBP"}
    try:
        with override(settings, currency="JPY"):
            raise RuntimeError("payment gateway down")
    except RuntimeError:
        pass
    else:
        raise AssertionError("the RuntimeError raised in the block should reach the caller")
    assert settings == {"currency": "GBP"}


@test("Is written with @contextmanager")
def _():
    original = getattr(override, "__wrapped__", None)
    assert original is not None and inspect.isgeneratorfunction(original), (
        "override should be a generator function decorated with @contextmanager"
    )


@hidden("Leaves keys it didn't change alone")
def _():
    settings = {"currency": "GBP", "rate_limit": 100}
    with override(settings, currency="EUR"):
        settings["rate_limit"] = 5
    assert settings == {"currency": "GBP", "rate_limit": 5}


@hidden("A setting that was None comes back as None")
def _():
    settings = {"webhook_url": None}
    with override(settings, webhook_url="https://example.com/hook"):
        pass
    assert settings == {"webhook_url": None}


@hidden("Overrides can nest")
def _():
    settings = {"currency": "GBP"}
    with override(settings, currency="EUR"):
        with override(settings, currency="USD", debug=True):
            assert settings == {"currency": "USD", "debug": True}
        assert settings == {"currency": "EUR"}
    assert settings == {"currency": "GBP"}
