import re
from functools import cache

from plp import hidden, raises, solution_source, source_uses, test, typecheck
from solution import get_setting

ENV = {"SHOP_HOST": "shop.example.com", "SHOP_PORT": "9000"}

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    'env = {"SHOP_HOST": "shop.example.com", "SHOP_PORT": "9000"}',
    'port: int = get_setting(env, "SHOP_PORT", 8000)',
    'host: str = get_setting(env, "SHOP_HOST", "localhost")',
    'token: str | None = get_setting(env, "SHOP_TOKEN")',
]
REJECTED = [
    'sure: str = get_setting(env, "SHOP_TOKEN")',
    'mixed_up: str = get_setting(env, "SHOP_PORT", 8000)',
    'get_setting(env, "SHOP_RATE", 1.5)',
    'get_setting({"SHOP_PORT": 9000}, "SHOP_PORT")',
]


@cache
def mypy_report() -> dict[str, list[str]]:
    code = solution_source().rstrip() + "\n"
    first = code.count("\n") + 4  # the line of the first appended use
    uses = ACCEPTED + REJECTED
    probe = code + "\n\ndef _uses() -> None:\n" + "".join(f"    {use}\n" for use in uses)
    own: list[str] = []
    flagged: dict[int, list[str]] = {}
    for error in typecheck(probe, strict=True).errors:
        found = re.match(r"solution\.py:(\d+):", error)
        line = int(found.group(1)) if found else 0
        if line < first:
            own.append(error)
        else:
            flagged.setdefault(line - first, []).append(error.split(": error: ", 1)[-1])
    # A call to an unannotated function is flagged too, but that isn't mypy catching the misuse
    rejected = {i for i, errors in flagged.items() if any("[no-untyped-call]" not in e for e in errors)}
    return {
        "own": own,
        "accepted": [f"{use}\n    {e}" for i, use in enumerate(ACCEPTED) for e in flagged.get(i, [])],
        "missed": [use for i, use in enumerate(REJECTED, start=len(ACCEPTED)) if i not in rejected],
    }


@test("Reads settings like the example")
def _():
    assert get_setting(ENV, "SHOP_HOST", "localhost") == "shop.example.com"
    assert get_setting(ENV, "SHOP_PORT", 8000) == 9000
    assert get_setting(ENV, "SHOP_WORKERS", 4) == 4
    assert get_setting(ENV, "SHOP_TOKEN") is None


@test("Refuses a number that isn't one")
def _():
    with raises(ValueError, match="SHOP_PORT must be a whole number, got 'eighty'"):
        get_setting({"SHOP_PORT": "eighty"}, "SHOP_PORT", 8000)


@test("Declares its signatures with @overload")
def _():
    assert source_uses(name="overload"), "use @overload for the three signatures"


@test("mypy --strict passes, and each call gets its own return type", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy rejects a possibly-missing value used as a str, and defaults of other types", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Returns text as it is, and ints as ints")
def _():
    assert get_setting({"SHOP_PORT": "9000"}, "SHOP_PORT") == "9000"
    assert get_setting({"SHOP_PORT": "9000"}, "SHOP_PORT", "8000") == "9000"
    assert type(get_setting({"SHOP_PORT": "9000"}, "SHOP_PORT", 1)) is int
    assert get_setting({}, "SHOP_HOST", "localhost") == "localhost"
