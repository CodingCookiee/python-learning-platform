import json
import re

from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import PAIRWISE_SYSTEM, Preference, compare, head_to_head

QUESTION = "How long do refunds take?"


def verdict(winner):
    return json.dumps({"reason": "Compared on the rubric.", "winner": winner})


def answer(tag, text):
    match = re.search(rf"<{tag}>\s*(.*?)\s*</{tag}>", text, re.S)
    return match.group(1) if match else None


def fair(request):
    """Prefers whichever answer mentions 14 days, wherever it is."""
    text = request["messages"][0]["content"]
    one, two = answer("answer_1", text) or "", answer("answer_2", text) or ""
    if ("14 days" in one) == ("14 days" in two):
        return verdict("tie")
    return verdict("1" if "14 days" in one else "2")


def biased(request):
    """Always prefers whatever it reads first."""
    return verdict("1")


@test("Compares the example: b wins both ways round")
def _():
    llm = ScriptedLLM([verdict("2"), verdict("1")])
    assert compare(llm, QUESTION, "Soon!", "Within 14 days.") == Preference("b", True)
    assert len(llm.calls) == 2


@test("Asks twice, swapping the answers, with the rubric at temperature 0")
def _():
    llm = ScriptedLLM([fair, fair])
    compare(llm, QUESTION, "Soon!", "Within 14 days.")
    first, second = (call["messages"][0]["content"] for call in llm.calls)
    assert (answer("answer_1", first), answer("answer_2", first)) == ("Soon!", "Within 14 days.")
    assert (answer("answer_1", second), answer("answer_2", second)) == ("Within 14 days.", "Soon!")
    assert answer("question", first) == QUESTION
    assert all(call["system"] == PAIRWISE_SYSTEM and call["temperature"] == 0 for call in llm.calls)


@test("A judge that always picks the first answer gets a tie, flagged inconsistent")
def _():
    assert compare(ScriptedLLM([biased, biased]), QUESTION, "Within 14 days.", "Soon!") == Preference("tie", False)


@test("A fair judge picks a, whichever order it reads them in")
def _():
    assert compare(ScriptedLLM([fair, fair]), QUESTION, "Within 14 days.", "Soon!") == Preference("a", True)


@hidden("Two ties are a consistent tie; a tie and a win are not")
def _():
    assert compare(ScriptedLLM([verdict("tie"), verdict("tie")]), QUESTION, "x", "y") == Preference("tie", True)
    assert compare(ScriptedLLM([verdict("tie"), verdict("2")]), QUESTION, "x", "y") == Preference("tie", False)


@hidden("head_to_head counts winners and inconsistent cases")
def _():
    cases = [
        {"question": QUESTION, "a": "Within 14 days.", "b": "Soon!"},
        {"question": QUESTION, "a": "Soon!", "b": "Refunds take 14 days."},
        {"question": QUESTION, "a": "Soon.", "b": "Shortly."},
        {"question": QUESTION, "a": "14 days to your card.", "b": "Two weeks."},
    ]
    assert head_to_head(ScriptedLLM([fair] * 8), cases) == {"a": 2, "b": 1, "tie": 1, "inconsistent": 0}
    assert head_to_head(ScriptedLLM([biased] * 8), cases) == {"a": 0, "b": 0, "tie": 4, "inconsistent": 4}
