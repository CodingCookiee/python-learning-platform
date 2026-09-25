from plp import test, hidden, run_program


@test("Skips a bad line and prints the summary")
def _():
    assert run_program(stdin=["12", "23", "twelve", "9", "13", ""]).lines == [
        'Skipping "twelve": not a whole number',
        "Days: 4",
        "Total: 57",
        "Best day: day 2 (23 units)",
    ]


@test('Stops at "done"')
def _():
    assert run_program(stdin=["5", "8", "done", "100"]).lines == ["Days: 2", "Total: 13", "Best day: day 2 (8 units)"]


@test("Says so when no sales were entered")
def _():
    assert run_program(stdin=[""]).lines == ["No sales recorded"]


@hidden("Reports the earlier day when two days tie")
def _():
    assert run_program(stdin=["4", "11", "6", "11", ""]).lines[-1:] == ["Best day: day 2 (11 units)"]


@hidden('Accepts "DONE" in capitals and numbers with spaces around them')
def _():
    assert run_program(stdin=[" 7 ", "3", "DONE"]).lines == ["Days: 2", "Total: 10", "Best day: day 1 (7 units)"]


@hidden("Counts only valid lines as days")
def _():
    assert run_program(stdin=["-3", "2.5", "abc", ""]).lines == [
        'Skipping "-3": not a whole number',
        'Skipping "2.5": not a whole number',
        'Skipping "abc": not a whole number',
        "No sales recorded",
    ]
