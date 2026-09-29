import re
from functools import cache

from plp import hidden, raises, solution_source, test, typecheck
from solution import fetch_rate, retry

# Lines mypy must accept and lines it must reject. They're appended to your code and
# checked in one mypy --strict run, because mypy takes a few seconds in the browser.
ACCEPTED = [
    'rate: float = fetch_rate("GBP")',
    "quick = retry(2)(fetch_rate)",
    'again: float = quick("USD")',
]
REJECTED = [
    "fetch_rate(1)",
    'retry("3")',
    'retry(3, on="ConnectionError")',
    'wrong: str = fetch_rate("EUR")',
    'quick("USD", "EUR")',
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


def flaky(failures: int, error: Exception):
    """A rate lookup that raises `error` for its first `failures` calls, counting every call."""
    calls = []

    def lookup(currency: str) -> float:
        calls.append(currency)
        if len(calls) <= failures:
            raise error
        return {"GBP": 0.86}[currency]

    return lookup, calls


@test("Retries until a call succeeds")
def _():
    lookup, calls = flaky(2, ConnectionError("reset by peer"))
    assert retry(3, on=ConnectionError)(lookup)("GBP") == 0.86
    assert calls == ["GBP", "GBP", "GBP"]
    assert fetch_rate("GBP") == 0.86


@test("Lets the last exception through when every attempt fails")
def _():
    lookup, calls = flaky(5, ConnectionError("reset by peer"))
    with raises(ConnectionError, match="reset by peer"):
        retry(3, on=ConnectionError)(lookup)("GBP")
    assert len(calls) == 3


@test("Doesn't retry other exceptions, and refuses times below 1")
def _():
    lookup, calls = flaky(1, KeyError("XYZ"))
    with raises(KeyError):
        retry(3, on=ConnectionError)(lookup)("GBP")
    assert len(calls) == 1
    with raises(ValueError):
        retry(0)


@test("mypy --strict passes and accepts correct calls", timeout=None)
def _():
    report = mypy_report()
    assert report["own"] == [], "mypy --strict reports:\n" + "\n".join(report["own"])
    assert report["accepted"] == [], "mypy rejects correct code:\n" + "\n".join(report["accepted"])


@test("mypy checks the decorator's arguments and the decorated function's calls", timeout=None)
def _():
    missed = mypy_report()["missed"]
    assert missed == [], "mypy should reject these, but accepts them:\n" + "\n".join(missed)


@hidden("Keeps the name, retries subclasses of on, and times=1 means one attempt")
def _():
    assert fetch_rate.__name__ == "fetch_rate"
    lookup, calls = flaky(1, ConnectionResetError("reset"))
    assert retry(2, on=ConnectionError)(lookup)("GBP") == 0.86
    lookup, calls = flaky(1, ConnectionError("reset"))
    with raises(ConnectionError):
        retry(1, on=ConnectionError)(lookup)("GBP")
    assert len(calls) == 1
