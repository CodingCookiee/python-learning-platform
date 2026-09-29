from plp import hidden, test
from solution import route


@test("Routes the example tickets")
def _():
    assert route("shipping", 0.93) == "shipping"
    assert route("billing", 0.55) == "human_review"
    assert route("unknown", 0.99) == "human_review"


@test("Uses the threshold it's given")
def _():
    assert route("billing", 0.55, threshold=0.5) == "billing"
    assert route("returns", 0.8, threshold=0.9) == "human_review"


@test("A confidence equal to the threshold is automated")
def _():
    assert route("technical", 0.75) == "technical"


@hidden("Unknown always goes to a person, whatever the threshold")
def _():
    assert route("unknown", 1.0, threshold=0.0) == "human_review"
    assert route("returns", 0.0, threshold=0.0) == "returns"
