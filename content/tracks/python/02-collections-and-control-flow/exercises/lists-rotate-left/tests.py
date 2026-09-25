from plp import test, hidden
from solution import rotate_left


@test("Moves the first person to the back")
def _():
    assert rotate_left(["Ada", "Grace", "Linus", "Margaret"], 1) == ["Grace", "Linus", "Margaret", "Ada"]


@test("Wraps around when n is larger than the rota")
def _():
    assert rotate_left(["Ada", "Grace", "Linus", "Margaret"], 5) == ["Grace", "Linus", "Margaret", "Ada"]


@test("Rotates right when n is negative")
def _():
    assert rotate_left(["Ada", "Grace", "Linus"], -1) == ["Linus", "Ada", "Grace"]


@test("Leaves the original rota unchanged")
def _():
    rota = ["Ada", "Grace", "Linus"]
    rotate_left(rota, 2)
    assert rota == ["Ada", "Grace", "Linus"]


@hidden("Returns a new list even when n is 0")
def _():
    rota = ["Ada", "Grace"]
    result = rotate_left(rota, 0)
    assert result == ["Ada", "Grace"]
    assert result is not rota, "rotate_left(rota, 0) should return a new list, not rota itself"


@hidden("Keeps an empty rota empty")
def _():
    assert rotate_left([], 3) == []
