from decimal import Decimal

import solution
from plp import hidden, raises, test
from plp_fakes import ScriptedLLM
from solution import ExtractionFailed, extract_invoice

DOCUMENT = "Kiln Supplies, total 1240.50 EUR"
MISSING_NUMBER = '{"invoice_number": "", "vendor": "Kiln Supplies", "currency": "EUR", "total": "1240.50"}'
GOOD = '{"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "currency": "EUR", "total": "1240.50"}'


@test("Gives up after 3 calls when the invoice can't be repaired")
def _():
    llm = ScriptedLLM([MISSING_NUMBER, MISSING_NUMBER, MISSING_NUMBER])
    raises(ExtractionFailed, extract_invoice, llm, DOCUMENT)
    assert len(llm.calls) == 3


@test("The exception carries the last problems and the last reply")
def _():
    llm = ScriptedLLM([MISSING_NUMBER, "I can't find one.", MISSING_NUMBER])
    with raises(ExtractionFailed, what="extract_invoice(llm, DOCUMENT)") as caught:
        extract_invoice(llm, DOCUMENT)
    assert caught.value.last_reply == MISSING_NUMBER
    assert "invoice_number" in caught.value.problems


@test("Still repairs a bad first reply")
def _():
    llm = ScriptedLLM([MISSING_NUMBER, GOOD])
    assert extract_invoice(llm, DOCUMENT).invoice_number == "INV-2291"
    assert len(llm.calls) == 2
    assert [m["role"] for m in llm.calls[1]["messages"]] == ["user", "assistant", "user"]


@test("A good first reply takes one call")
def _():
    llm = ScriptedLLM([GOOD])
    assert extract_invoice(llm, DOCUMENT).total == Decimal("1240.50")
    assert len(llm.calls) == 1


@hidden("Uses MAX_ATTEMPTS, so changing it changes the limit")
def _():
    saved = solution.MAX_ATTEMPTS
    solution.MAX_ATTEMPTS = 2
    try:
        llm = ScriptedLLM([MISSING_NUMBER, MISSING_NUMBER])
        raises(ExtractionFailed, extract_invoice, llm, DOCUMENT)
        assert len(llm.calls) == 2
    finally:
        solution.MAX_ATTEMPTS = saved


@hidden("Succeeds on the last allowed attempt")
def _():
    llm = ScriptedLLM(["Sorry, which invoice?", MISSING_NUMBER, GOOD])
    assert extract_invoice(llm, DOCUMENT).vendor == "Kiln Supplies"
