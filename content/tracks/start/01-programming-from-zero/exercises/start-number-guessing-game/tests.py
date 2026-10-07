import contextlib
import random

from plp import test, hidden, run_program, solution_source, defined_names


@contextlib.contextmanager
def secret_number(secret):
    """While the block runs, random.randint hands back `secret`, and every call is recorded."""
    calls = []

    def fixed_randint(low, high):
        calls.append((low, high))
        return secret

    original = random.randint
    random.randint = fixed_randint
    try:
        yield calls
    finally:
        random.randint = original


@test("Plays a game where the secret is 12")
def _():
    with secret_number(12):
        assert run_program(stdin=["10", "15", "12"]).lines == [
            "higher",
            "lower",
            "correct",
            "You win! Guesses: 3",
        ]


@test("Wins on the first guess")
def _():
    with secret_number(7):
        assert run_program(stdin=["7"]).lines == ["correct", "You win! Guesses: 1"]


@test("Picks the secret once, with random.randint(1, 20)")
def _():
    with secret_number(5) as calls:
        # A program that picks its secret another way runs out of guesses: the check below explains why
        with contextlib.suppress(EOFError):
            run_program(stdin=["3", "8", "5"])
    assert calls != [], "Pick the secret number with random.randint(1, 20)"
    made = ", ".join(f"random.randint({low}, {high})" for low, high in calls)
    assert calls == [(1, 20)], f"Call random.randint(1, 20) once, before the loop. Your program called: {made}"


@hidden("Uses the hint function for each guess")
def _():
    assert "hint" in defined_names("function"), "Keep the hint function at the top of your program"
    assert solution_source().count("hint(") >= 2, "Call hint(secret, guess) inside the loop to get each hint"


@hidden("Counts every guess in a longer game")
def _():
    with secret_number(20):
        assert run_program(stdin=["1", "10", "19", "20"]).lines == [
            "higher",
            "higher",
            "higher",
            "correct",
            "You win! Guesses: 4",
        ]


@hidden("Works when the secret is 1, and counts a repeated guess")
def _():
    with secret_number(1):
        assert run_program(stdin=["5", "5", "2", "1"]).lines == [
            "lower",
            "lower",
            "lower",
            "correct",
            "You win! Guesses: 4",
        ]
