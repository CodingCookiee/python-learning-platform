from pydantic import SecretStr, ValidationError

from plp import hidden, raises, test
from solution import load_settings

ENV = {
    "SHOP_DATABASE_URL": "postgresql://shop@db/shop",
    "SHOP_API_KEY": "sk_live_51H8",
    "SHOP_DEBUG": "true",
    "SHOP_ALLOWED_ORIGINS": "https://shop.example.com, https://admin.example.com",
    "PATH": "/usr/bin",
}


@test("Loads the example environment")
def _():
    settings = load_settings(ENV)
    assert (settings.debug, settings.port) == (True, 8000)
    assert settings.allowed_origins == ["https://shop.example.com", "https://admin.example.com"]
    assert settings.database_url == "postgresql://shop@db/shop"


@test("Keeps the API key secret")
def _():
    settings = load_settings(ENV)
    assert isinstance(settings.api_key, SecretStr)
    assert settings.api_key.get_secret_value() == "sk_live_51H8"
    assert "sk_live_51H8" not in repr(settings), "the key shows up in repr(settings)"
    assert "sk_live_51H8" not in str(settings), "the key shows up in str(settings)"


@test("Refuses missing and invalid settings, naming the field")
def _():
    with raises(ValidationError, match="database_url"):
        load_settings({"SHOP_API_KEY": "sk_test_1"})
    with raises(ValidationError, match="port"):
        load_settings({**ENV, "SHOP_PORT": "70000"})
    with raises(ValidationError, match="debug"):
        load_settings({**ENV, "SHOP_DEBUG": "sometimes"})


@test("Can't be changed once loaded")
def _():
    settings = load_settings(ENV)
    with raises(ValidationError):
        settings.debug = False


@hidden("Uses the defaults, another prefix, and ignores other variables")
def _():
    minimal = load_settings({"SHOP_DATABASE_URL": "sqlite:///shop.db", "SHOP_API_KEY": "k", "SHOP_THEME": "dark"})
    assert (minimal.debug, minimal.port, minimal.allowed_origins) == (False, 8000, [])
    staging = load_settings({"STAGING_DATABASE_URL": "sqlite:///s.db", "STAGING_API_KEY": "k", "STAGING_PORT": "9000"}, prefix="STAGING_")
    assert staging.port == 9000
    assert load_settings({**ENV, "SHOP_ALLOWED_ORIGINS": " , "}).allowed_origins == []
    with raises(ValidationError, match="database_url"):
        load_settings({"DATABASE_URL": "sqlite:///shop.db", "API_KEY": "k"})
