from plp import hidden, test, typecheck
from solution import banner, find_customer, greeting, points_balance, points_message


@test("Greets, counts and shows banners like the example")
def _():
    assert greeting("ada@example.com") == "Hello Ada"
    assert greeting("new@example.com") == "Hello there"
    assert points_balance("new@example.com") == 0
    assert banner("grace@example.com") == "WELCOME"
    assert banner("ada@example.com") == "YOU HAVE 120 POINTS"


@test("mypy --strict passes", timeout=None)
def _():
    problems = typecheck(strict=True).errors
    assert problems == [], "mypy --strict reports:\n" + "\n".join(problems)


@test("Strangers get the welcome banner too")
def _():
    assert banner("new@example.com") == "WELCOME"
    assert points_message("new@example.com") is None


@hidden("Known customers still work, whatever the case and spacing")
def _():
    assert greeting("  ADA@example.com ") == "Hello Ada"
    assert points_balance("ada@example.com") == 120
    assert points_balance("grace@example.com") == 0
    assert find_customer("nobody@example.com") is None
