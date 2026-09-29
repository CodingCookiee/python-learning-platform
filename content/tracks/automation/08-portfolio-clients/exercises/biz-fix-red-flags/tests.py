from plp import hidden, test
from solution import find_red_flags


@test("Words inside other words aren't red flags")
def _():
    assert find_red_flags("Their last freelancer left. The specification is a Word document.") == []


@test("Matches in any case")
def _():
    assert find_red_flags("Owner offered EQUITY instead of a fee.") == ["offers equity instead of payment"]


@test("Finds several, in table order")
def _():
    notes = "Wants UNLIMITED revisions. Asked if we'd build a prototype on spec first. Free pilot?"
    assert find_red_flags(notes) == [
        "wants work done on spec, before agreeing to pay",
        "expects some of the work for free",
        "expects unlimited changes",
    ]


@hidden("Punctuation around a word still counts as a boundary")
def _():
    assert find_red_flags("(equity), 'spec'") == [
        "wants work done on spec, before agreeing to pay",
        "offers equity instead of payment",
    ]


@hidden("A word mentioned twice is reported once")
def _():
    assert find_red_flags("Free trial, then free support.") == ["expects some of the work for free"]


@hidden("Clean notes have no red flags")
def _():
    assert find_red_flags("Practice manager signs off budgets up to the agreed amount. Start in March.") == []
