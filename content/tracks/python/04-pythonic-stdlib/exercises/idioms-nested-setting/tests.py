from plp import test, hidden
from solution import get_setting

CONFIG = {
    "database": {"host": "db.internal", "port": 5432},
    "debug": False,
    "workers": 4,
}


@test("Reads nested and top-level settings")
def _():
    assert get_setting(CONFIG, "database.host") == "db.internal"
    assert get_setting(CONFIG, "workers") == 4


@test("Returns the default for missing keys")
def _():
    assert get_setting(CONFIG, "database.user", "postgres") == "postgres"
    assert get_setting(CONFIG, "cache.ttl") is None


@test("Returns the default when the path runs into a value that isn't a dict")
def _():
    assert get_setting(CONFIG, "workers.max", 8) == 8
    assert get_setting(CONFIG, "database.host.name", "?") == "?"


@hidden("Returns falsy values that are really stored")
def _():
    assert get_setting(CONFIG, "debug", True) is False


@hidden("Returns whole sections")
def _():
    assert get_setting(CONFIG, "database") == {"host": "db.internal", "port": 5432}


@hidden("Works with deeper nesting")
def _():
    config = {"queues": {"email": {"retries": {"max": 5}}}}
    assert get_setting(config, "queues.email.retries.max") == 5
    assert get_setting(config, "queues.sms.retries.max", 0) == 0
