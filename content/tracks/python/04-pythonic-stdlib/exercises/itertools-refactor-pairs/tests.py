from plp import test, hidden, source_uses, source_avoids
from solution import gaps, variants


@test("Still gives the same answers")
def _():
    assert gaps([0, 30, 45, 400]) == [30, 15, 355]
    assert variants(["S", "M"], ["red", "blue"]) == ["S-red", "S-blue", "M-red", "M-blue"]


@test("gaps uses pairwise")
def _():
    assert source_uses(call="pairwise"), "Use itertools.pairwise in gaps"


@test("variants uses product")
def _():
    assert source_uses(call="product"), "Use itertools.product in variants"


@test("No range() calls are left")
def _():
    assert source_avoids(call="range"), "pairwise replaces the range(len(...)) loop"


@hidden("Fewer than two timestamps give no gaps")
def _():
    assert gaps([]) == []
    assert gaps([12]) == []


@hidden("No colours means no variants")
def _():
    assert variants(["S", "M"], []) == []
