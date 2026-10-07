from plp import test, hidden, load_module, run_program


@test("Runs without an error")
def _():
    run_program()


@test("Prints the total")
def _():
    assert run_program().lines == ["Total: 8"]


@hidden("Keeps the price under the name tea_price")
def _():
    assert getattr(load_module(), "tea_price", None) == 2, (
        "Write the name with an underscore, tea_price, the way the last line does"
    )
