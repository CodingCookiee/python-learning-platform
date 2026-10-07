from plp import test, hidden, run_program


@test("A medium costs 3")
def _():
    assert run_program(stdin=["M"]).lines == ["Medium coffee: 3"]


@test("A small costs 2")
def _():
    assert run_program(stdin=["S"]).lines == ["Small coffee: 2"]


@test("A large costs 4")
def _():
    assert run_program(stdin=["L"]).lines == ["Large coffee: 4"]


@test("XL isn't on the menu")
def _():
    assert run_program(stdin=["XL"]).lines == ["Sorry, we only have S, M and L."]


@hidden("A whole word isn't a size either")
def _():
    assert run_program(stdin=["Large"]).lines == ["Sorry, we only have S, M and L."]
