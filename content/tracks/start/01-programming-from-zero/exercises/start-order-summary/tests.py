from plp import test, hidden, run_program, solution_source, source_uses


@test("Prints the summary")
def _():
    assert run_program().lines == ["Order for Priya", "2 x tea at 3 each", "Total: 6"]


@test("Uses f-strings")
def _():
    assert source_uses(node="JoinedStr"), 'Build each line with an f-string, such as f"Order for {customer}"'


@hidden("Follows a different order")
def _():
    other_order = (
        solution_source()
        .replace('customer = "Priya"', 'customer = "Tom"')
        .replace('item = "tea"', 'item = "coffee"')
        .replace("price = 3", "price = 4")
        .replace("quantity = 2", "quantity = 5")
    )
    assert run_program(source=other_order).lines == ["Order for Tom", "5 x coffee at 4 each", "Total: 20"], (
        "Use the names customer, item, price and quantity inside your f-strings, so a different order prints a different summary"
    )
