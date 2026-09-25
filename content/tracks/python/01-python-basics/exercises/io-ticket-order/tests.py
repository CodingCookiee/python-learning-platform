from plp import test, hidden, run_program


@test("Prices three tickets")
def _():
    assert run_program(stdin=["3"]).lines == ["Tickets: 3 x 12.50 = 37.50"]


@test("Refuses an order of more than 8")
def _():
    assert run_program(stdin=["9"]).lines == ["You can buy 1 to 8 tickets."]


@test("Asks again for text that isn't a number")
def _():
    assert run_program(stdin=["three"]).lines == ["Please enter a whole number."]


@hidden("Accepts the largest order, with spaces around it")
def _():
    assert run_program(stdin=[" 8 "]).lines == ["Tickets: 8 x 12.50 = 100.00"]


@hidden("Refuses an order of zero")
def _():
    assert run_program(stdin=["0"]).lines == ["You can buy 1 to 8 tickets."]


@hidden("Rejects decimals, negatives and blank input without crashing")
def _():
    for typed in ["2.5", "-3", ""]:
        assert run_program(stdin=[typed]).lines == ["Please enter a whole number."], (
            f"For the input {typed!r}, print exactly: Please enter a whole number."
        )
