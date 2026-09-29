from plp import hidden, test
from solution import call_agenda

SECTIONS = [("Introductions", 3), ("Their business", 7), ("The process", 12),
            ("Success and constraints", 5), ("Next steps", 3)]


@test("Plans a 30-minute call at 14:00")
def _():
    assert call_agenda(SECTIONS, start="14:00") == [
        "14:00-14:03 Introductions",
        "14:03-14:10 Their business",
        "14:10-14:22 The process",
        "14:22-14:27 Success and constraints",
        "14:27-14:30 Next steps",
    ]


@test("Starts at 00:00 by default, so the times read as minutes into the call")
def _():
    assert call_agenda([("Introductions", 5), ("The process", 20)]) == [
        "00:00-00:05 Introductions",
        "00:05-00:25 The process",
    ]


@test("Crosses the hour")
def _():
    assert call_agenda([("Recap", 15)], start="09:50") == ["09:50-10:05 Recap"]


@hidden("No sections, no agenda")
def _():
    assert call_agenda([], start="11:00") == []
