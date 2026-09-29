import re

from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import JUDGE_SYSTEM, judge

CASE = {
    "id": "refund-window",
    "question": "How long do refunds take?",
    "reference": "Refunds reach the card within 14 days.",
    "human_label": "fail",
    "labeller_notes": "Promises a free label, which we don't offer.",
}
ANSWER = "Within 14 days, and we'll send a free return label!"
FAILS = '{"reason": "Promises a free return label.", "passes": false}'
PASSES = '{"reason": "States the 14-day window.", "passes": true}'


def block(tag, text):
    return re.compile(rf"<{tag}>\s*{re.escape(text)}\s*</{tag}>")


def message(llm):
    return llm.calls[0]["messages"][0]["content"]


@test("Grades the example without showing the judge the label")
def _():
    llm = ScriptedLLM([FAILS])
    assert judge(llm, CASE, ANSWER) is False
    assert "fail" not in message(llm)
    assert "free label, which" not in message(llm)
    assert "refund-window" not in message(llm)


@test("The question, reference and answer are each in their own block")
def _():
    llm = ScriptedLLM([PASSES])
    judge(llm, CASE, "Refunds reach your card within 14 days.")
    text = message(llm)
    assert block("question", CASE["question"]).search(text), "no <question> block with the question"
    assert block("reference", CASE["reference"]).search(text), "no <reference> block with the reference"
    assert block("answer", "Refunds reach your card within 14 days.").search(text), "no <answer> block with the answer"


@test("Keeps the rubric as the system prompt, at temperature 0, in one message")
def _():
    llm = ScriptedLLM([PASSES])
    assert judge(llm, CASE, "Refunds reach your card within 14 days.") is True
    assert llm.calls[0]["system"] == JUDGE_SYSTEM
    assert llm.calls[0]["temperature"] == 0
    assert [m["role"] for m in llm.calls[0]["messages"]] == ["user"]


@hidden("No field names or extra fields leak, whatever the case holds")
def _():
    case = {**CASE, "human_label": "pass", "labeller_notes": "LGTM-7731", "expected_verdict": "PASS-9920", "judge_hint": "HINT-4410"}
    llm = ScriptedLLM([PASSES])
    judge(llm, case, ANSWER)
    text = message(llm)
    for leak in ("human_label", "labeller_notes", "LGTM-7731", "PASS-9920", "HINT-4410", "expected_verdict"):
        assert leak not in text, f"{leak!r} reached the judge"


@hidden("A judge that copies the label now has nothing to copy")
def _():
    def copycat(request):
        text = request["messages"][0]["content"]
        return PASSES if '"pass"' in text else FAILS

    llm = ScriptedLLM([copycat])
    assert judge(llm, {**CASE, "human_label": "pass"}, ANSWER) is False
