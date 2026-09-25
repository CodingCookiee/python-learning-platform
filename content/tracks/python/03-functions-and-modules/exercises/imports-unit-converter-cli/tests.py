import contextlib
import io

import solution
from plp import test, hidden, run_program, solution_source
from solution import convert, parse_request


def raises_value_error(call, message):
    try:
        call()
    except ValueError as exc:
        assert str(exc) == message, f"Raised ValueError({str(exc)!r}), expected the message {message!r}"
        return
    raise AssertionError(f"Expected ValueError({message!r}), but nothing was raised")


@test("convert goes from one unit to another")
def _():
    assert convert(12.5, "km", "mi") == 7.77
    assert convert(3, "ft", "cm") == 91.44
    assert convert(1, "ft", "in") == 12.0


@test("convert rejects an unknown unit")
def _():
    raises_value_error(lambda: convert(1, "parsec", "m"), "Unknown unit: parsec")
    raises_value_error(lambda: convert(1, "m", "furlong"), "Unknown unit: furlong")


@test("parse_request splits a request line")
def _():
    assert parse_request("12.5 km to mi") == (12.5, "km", "mi")
    assert parse_request("3 ft to cm") == (3.0, "ft", "cm")


@test("parse_request rejects a malformed line")
def _():
    raises_value_error(lambda: parse_request("12.5 km"), 'Expected "<number> <unit> to <unit>"')
    raises_value_error(lambda: parse_request("12.5 km in mi"), 'Expected "<number> <unit> to <unit>"')


@test("Run as a script, it converts each line until a blank one")
def _():
    output = run_program(stdin=["12.5 km to mi", "3 ft to cm", "1 parsec to m", ""])
    assert output.lines == ["12.5 km = 7.77 mi", "3 ft = 91.44 cm", "Error: Unknown unit: parsec"]


@hidden("Keeps going after a malformed line")
def _():
    lines = run_program(stdin=["ten km to m", "5 m", "250 cm to m", ""]).lines
    assert len(lines) == 3, f"Expected one line of output per request, got {lines!r}"
    assert lines[0].startswith("Error: "), f"A number that isn't a number should print an error, not {lines[0]!r}"
    assert lines[1:] == ['Error: Expected "<number> <unit> to <unit>"', "250 cm = 2.50 m"]


@hidden("Importing the file runs nothing and prints nothing")
def _():
    assert callable(getattr(solution, "main", None)), "Put the program in a function called main()"
    screen = io.StringIO()
    with contextlib.redirect_stdout(screen):
        exec(compile(solution_source(), "solution.py", "exec"), {"__name__": "converter"})
    assert screen.getvalue() == "", f"Importing the file printed {screen.getvalue()!r}: keep all printing inside main()"
