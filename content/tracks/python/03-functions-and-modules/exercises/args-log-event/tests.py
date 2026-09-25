from plp import test, hidden
from solution import log_line


@test("Formats the level, message and fields")
def _():
    assert log_line("warning", "disk nearly full", host="web-1", used="93%") == "WARNING disk nearly full host=web-1 used=93%"


@test("Quotes values that contain a space")
def _():
    assert log_line("info", "login", user="Ada Lovelace", attempts=2) == 'INFO login user="Ada Lovelace" attempts=2'


@test("Allows fields called message and level")
def _():
    try:
        line = log_line("info", "email sent", message="welcome back", level="gold")
    except TypeError as exc:
        raise AssertionError(f"A field called message or level should be allowed, but the call raised TypeError: {exc}") from None
    assert line == 'INFO email sent message="welcome back" level=gold'


@hidden("Works with no fields")
def _():
    assert log_line("error", "payment failed") == "ERROR payment failed"


@hidden("Formats numbers, booleans and None as text")
def _():
    assert log_line("debug", "cache", hits=41, warm=True, ttl=None) == "DEBUG cache hits=41 warm=True ttl=None"
