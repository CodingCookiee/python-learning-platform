from plp import hidden, raises, test
from solution import load_cases

GOOD = '{"id": "inv-001", "input": "Kiln Supplies INV-2291 ...", "expected": {"total": "1240.50"}}\n\n{"id": "inv-002", "input": "..."}\n'


@test("Loads the example, skipping the blank line")
def _():
    assert [case["id"] for case in load_cases(GOOD)] == ["inv-001", "inv-002"]
    assert load_cases(GOOD)[0]["expected"] == {"total": "1240.50"}


@test("A broken line raises ValueError naming its line number")
def _():
    raises(ValueError, load_cases, '{"id": "inv-001", "input": "..."}\n{"id": "inv-002", "input": "...}\n', match=r"^line 2:")


@test("Blank lines still count towards the line number")
def _():
    text = '{"id": "inv-001", "input": "..."}\n\n   \n{"id": "inv-004", "input": }\n'
    raises(ValueError, load_cases, text, match=r"^line 4:")


@test("A case without an id or an input is rejected")
def _():
    raises(ValueError, load_cases, '{"id": "inv-001", "input": "..."}\n{"input": "no id here"}\n', match=r"^line 2:.*id")
    raises(ValueError, load_cases, '{"id": "inv-003", "expected": {}}\n', match=r"^line 1:.*input")


@hidden("A duplicate id is rejected on its second appearance, by name")
def _():
    text = '{"id": "inv-001", "input": "a"}\n{"id": "inv-002", "input": "b"}\n{"id": "inv-001", "input": "c"}\n'
    raises(ValueError, load_cases, text, match=r"^line 3:.*inv-001")


@hidden("A line that's JSON but not an object is rejected")
def _():
    raises(ValueError, load_cases, '["inv-001", "..."]\n', match=r"^line 1:")
    assert load_cases("") == []
