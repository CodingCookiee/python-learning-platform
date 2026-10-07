from plp import test, hidden, run_program, load_module


@test("Runs without an error")
def _():
    run_program()


@test("Prints the family's total")
def _():
    assert run_program().lines == ["Total: 26"]


@hidden("ticket_price hands back the right price for any age")
def _():
    ticket_price = load_module("cinema").ticket_price
    assert ticket_price(5) == 6
    assert ticket_price(11) == 6
    assert ticket_price(12) == 10
    assert ticket_price(70) == 10
