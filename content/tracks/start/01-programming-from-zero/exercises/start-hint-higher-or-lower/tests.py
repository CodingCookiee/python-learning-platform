from plp import test, hidden
from solution import hint


@test("Says higher when the guess is too low")
def _():
    assert hint(12, 5) == "higher"


@test("Says lower when the guess is too high")
def _():
    assert hint(12, 18) == "lower"


@test("Says correct when the guess is right")
def _():
    assert hint(12, 12) == "correct"


@hidden("Gets guesses that are just one away")
def _():
    assert hint(12, 11) == "higher"
    assert hint(12, 13) == "lower"


@hidden("Works at the edges, 1 and 20")
def _():
    assert hint(1, 1) == "correct"
    assert hint(20, 20) == "correct"
    assert hint(1, 20) == "lower"
    assert hint(20, 1) == "higher"


@hidden("Gives the right hint for every secret and guess from 1 to 20")
def _():
    for secret in range(1, 21):
        for guess in range(1, 21):
            if secret > guess:
                expected = "higher"
            elif secret < guess:
                expected = "lower"
            else:
                expected = "correct"
            got = hint(secret, guess)
            assert got == expected, f"hint({secret}, {guess}) returned {got!r}, expected {expected!r}"
