from plp import test, hidden
from solution import cart_action


@test("Handles add with a quantity, remove, and a bad quantity")
def _():
    assert cart_action("add mug 3") == "Add 3 x mug"
    assert cart_action("remove mug tee") == "Remove mug, tee"
    assert cart_action("add mug lots") == 'Unknown command: "add mug lots"'


@test("Adds one when no quantity is given")
def _():
    assert cart_action("add scarf") == "Add 1 x scarf"


@test("Understands clear and checkout")
def _():
    assert cart_action("clear") == "Empty the cart"
    assert cart_action("checkout") == "Go to checkout"


@test("Removes a single item")
def _():
    assert cart_action("remove cap") == "Remove cap"


@hidden("Treats remove with no items as unknown")
def _():
    assert cart_action("remove") == 'Unknown command: "remove"'


@hidden("Ignores extra spaces between words")
def _():
    assert cart_action("  add   tee   2 ") == "Add 2 x tee"


@hidden("Rejects commands with extra words or none at all")
def _():
    assert cart_action("clear everything") == 'Unknown command: "clear everything"'
    assert cart_action("add mug 3 now") == 'Unknown command: "add mug 3 now"'
    assert cart_action("") == 'Unknown command: ""'
