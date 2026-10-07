from plp import test, hidden, run_program


@test("A basket of 45 gets free delivery")
def _():
    assert run_program(stdin=["45"]).lines == ["Free delivery!", "Thank you for your order."]


@test("A basket of 12 only gets the thank-you")
def _():
    assert run_program(stdin=["12"]).lines == ["Thank you for your order."]


@hidden("A basket of exactly 30 gets free delivery")
def _():
    assert run_program(stdin=["30"]).lines == ["Free delivery!", "Thank you for your order."]


@hidden("A basket of 29 is just short")
def _():
    assert run_program(stdin=["29"]).lines == ["Thank you for your order."]
