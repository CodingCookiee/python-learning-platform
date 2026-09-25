import solution
from plp import test, hidden, run_program
from solution import to_pence, total_pence


@test("Importing the file gives you the functions")
def _():
    assert to_pence("£12.50") == 1250
    assert total_pence(["£12.50", "3.99"]) == 1649


@test("Run as a script, it still totals the prices")
def _():
    assert run_program(stdin=["£12.50", "3.99", ""]).lines == ["Total: 1649p"]


@test("The program lives in a main() function")
def _():
    assert callable(getattr(solution, "main", None)), "Move the input loop and the print into a function called main()"


@hidden("Run as a script with no prices, the total is 0p")
def _():
    assert run_program(stdin=[""]).lines == ["Total: 0p"]


@hidden("Still asks for each price")
def _():
    result = run_program(stdin=["1.00", ""])
    assert result.prompts == "Price (blank to finish): " * 2, "Keep the input() prompt text the same"
