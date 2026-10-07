import re

from plp import test, hidden, load_module, run_program, solution_source


@test("Prints Ticket price: 8")
def _():
    assert run_program().lines[:1] == ["Ticket price: 8"]


@test("Keeps the price under the name ticket_price")
def _():
    assert getattr(load_module(), "ticket_price", None) == 8, "Give the price its name with ticket_price = 8"


@hidden("Prints the price through its name")
def _():
    changed = re.sub(r"^(\s*ticket_price\s*=\s*)8\b", r"\g<1>9", solution_source(), count=1, flags=re.M)
    assert run_program(source=changed).lines[:1] == ["Ticket price: 9"], (
        "When ticket_price is 9, your program should print Ticket price: 9. Print the name, not the number 8"
    )


@hidden("Prints nothing else")
def _():
    assert run_program().lines == ["Ticket price: 8"]
