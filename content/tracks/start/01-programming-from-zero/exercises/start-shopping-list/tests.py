from plp import test, hidden, run_program, solution_source, source_uses

SHOPPING = '["bread", "milk", "eggs", "apples"]'


@test("Prints every item with a dash in front")
def _():
    assert run_program().lines == ["- bread", "- milk", "- eggs", "- apples"]


@test("Uses a for loop")
def _():
    assert source_uses(node="For"), "Go through the list with a for loop: for item in shopping:"


@hidden("Prints an item that is added to the list")
def _():
    assert SHOPPING in solution_source(), "Keep the shopping list line as it was given"
    longer = solution_source().replace(SHOPPING, '["bread", "milk", "eggs", "apples", "jam"]')
    assert run_program(source=longer).lines == ["- bread", "- milk", "- eggs", "- apples", "- jam"]
