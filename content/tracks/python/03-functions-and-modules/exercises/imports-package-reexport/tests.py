from plp import test, hidden, defined_names


@test("The package exposes reorder and LOW_STOCK")
def _():
    import inventory
    import inventory.stock

    assert inventory.reorder is inventory.stock.reorder
    assert inventory.LOW_STOCK == 3


@test("Lists the items to reorder")
def _():
    from solution import shopping_list

    assert shopping_list({"tea": 1, "milk": 9, "coffee": 2}) == ["coffee (have 2)", "tea (have 1)"]


@test("Nothing to reorder gives an empty list")
def _():
    from solution import shopping_list

    assert shopping_list({"milk": 9}) == []


@hidden("Stock at exactly LOW_STOCK isn't reordered")
def _():
    from solution import shopping_list

    assert shopping_list({"eggs": 3, "flour": 0}) == ["flour (have 0)"]


@hidden("main.py uses the package's reorder")
def _():
    assert defined_names("function") == ["shopping_list"], "Import reorder from inventory instead of writing your own"
