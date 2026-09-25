from plp import test, hidden
from solution import parse_fields


@test("Parses bare and quoted values")
def _():
    assert parse_fields('level=error msg="disk full on /var" host=web-2 retries=3') == {
        "level": "error",
        "msg": "disk full on /var",
        "host": "web-2",
        "retries": "3",
    }


@test("Keeps empty values")
def _():
    assert parse_fields('user= action=login note=""') == {"user": "", "action": "login", "note": ""}


@test("Ignores words that aren't pairs")
def _():
    assert parse_fields("WARN level=warn something happened id=7") == {"level": "warn", "id": "7"}


@hidden("Quoted values may contain = signs")
def _():
    assert parse_fields('query="status=paid&page=2" ok=1') == {"query": "status=paid&page=2", "ok": "1"}


@hidden("Keeps the order of the line, and the last value of a repeated key")
def _():
    result = parse_fields("b=1 a=2 b=3")
    assert result == {"b": "3", "a": "2"}
    assert list(result) == ["b", "a"]


@hidden("An empty line has no fields")
def _():
    assert parse_fields("") == {}
