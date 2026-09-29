from decimal import Decimal

from plp import hidden, test
from solution import qualify

MIN = Decimal("5000")
CLINIC = {"budget": Decimal("6000"), "decision_maker": True, "monthly_pain": Decimal("900"),
          "start_within_days": None, "red_flags": []}


@test("The clinic is qualified, with the timeline still to ask about")
def _():
    assert qualify(CLINIC, min_budget=MIN) == {"score": 75, "verdict": "qualified", "unknowns": ["timeline"]}


@test("All four met scores 100")
def _():
    notes = {**CLINIC, "start_within_days": 30}
    assert qualify(notes, min_budget=MIN) == {"score": 100, "verdict": "qualified", "unknowns": []}


@test("A high score without the budget is only a follow-up")
def _():
    notes = {**CLINIC, "budget": Decimal("3000"), "start_within_days": 45}
    assert qualify(notes, min_budget=MIN)["verdict"] == "follow up"


@test("Missing keys are unknowns, and unknowns score nothing")
def _():
    assert qualify({}, min_budget=MIN) == {
        "score": 0, "verdict": "not now", "unknowns": ["budget", "authority", "need", "timeline"]}


@test("One red flag moves the verdict down a step, two decline")
def _():
    one = {**CLINIC, "red_flags": ["wants unlimited changes"]}
    two = {**CLINIC, "start_within_days": 30, "red_flags": ["spec work", "equity instead of a fee"]}
    assert qualify(one, min_budget=MIN)["verdict"] == "follow up"
    assert qualify(two, min_budget=MIN)["verdict"] == "decline"


@hidden("The need is a year of the pain against the budget floor, and False authority is known")
def _():
    notes = {"budget": Decimal("5000"), "decision_maker": False, "monthly_pain": Decimal("416.66"),
             "start_within_days": 91}
    assert qualify(notes, min_budget=MIN) == {"score": 25, "verdict": "not now", "unknowns": []}
    notes["monthly_pain"] = Decimal("416.67")
    assert qualify(notes, min_budget=MIN)["score"] == 50


@hidden("One red flag on a 'not now' stays 'not now'; exactly 90 days counts")
def _():
    notes = {"start_within_days": 90, "red_flags": ["no access to the data"]}
    assert qualify(notes, min_budget=MIN) == {
        "score": 25, "verdict": "not now", "unknowns": ["budget", "authority", "need"]}
