import json

from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import JUDGE_SYSTEM, WRITER_SYSTEM, Best, improve_prompt, judge_prompt, optimise, write_prompt

BRIEF = "Harbour Dental's practice manager, Priya. Northwind cuts appointment no-shows. Ask for a 20-minute call."
DRAFT_A = "Hi Priya, would you like a demo of Northwind?"
DRAFT_B = "Hi Priya, three clinics like Harbour Dental cut no-shows by 30% with Northwind. Could we talk for 20 minutes on Thursday?"
DRAFT_C = "Hi Priya! Northwind is the BEST. Call us!!!"


def score(value, feedback=""):
    return json.dumps({"score": value, "feedback": feedback})


@test("Improves until the judge is happy, as in the example")
def _():
    writer = ScriptedLLM([DRAFT_A, DRAFT_B])
    judge = ScriptedLLM([score(5, "Too vague; give a concrete result."), score(9, "Specific and short.")])
    assert optimise(writer, judge, BRIEF) == Best(DRAFT_B, 9, 2)
    assert (len(writer.calls), len(judge.calls)) == (2, 2)


@test("The judge scores the latest draft, and the writer gets the feedback")
def _():
    writer = ScriptedLLM([DRAFT_A, DRAFT_B])
    judge = ScriptedLLM([score(5, "Too vague; give a concrete result."), score(9)])
    optimise(writer, judge, BRIEF)
    assert [call["messages"][0]["content"] for call in judge.calls] == [judge_prompt(BRIEF, DRAFT_A), judge_prompt(BRIEF, DRAFT_B)]
    assert all(call["system"] == JUDGE_SYSTEM and call["temperature"] == 0 for call in judge.calls)
    assert [call["messages"][0]["content"] for call in writer.calls] == [
        write_prompt(BRIEF), improve_prompt(BRIEF, DRAFT_A, "Too vague; give a concrete result.")]
    assert all(call["system"] == WRITER_SYSTEM for call in writer.calls)


@test("Returns the best draft, not the last one")
def _():
    writer = ScriptedLLM([DRAFT_B, DRAFT_A, DRAFT_C])
    judge = ScriptedLLM([score(7, "Nearly"), score(4, "Vague"), score(2, "Shouty")])
    assert optimise(writer, judge, BRIEF) == Best(DRAFT_B, 7, 3)
    assert len(writer.calls) == 3, "No improvement after the last round's score"


@test("threshold and max_rounds are honoured")
def _():
    assert optimise(ScriptedLLM([DRAFT_A]), ScriptedLLM([score(5)]), BRIEF, threshold=5) == Best(DRAFT_A, 5, 1)
    assert optimise(ScriptedLLM([DRAFT_A]), ScriptedLLM([score(5)]), BRIEF, max_rounds=1) == Best(DRAFT_A, 5, 1)


@hidden("A reply that isn't a score counts as 0, and ties keep the earlier draft")
def _():
    writer = ScriptedLLM([DRAFT_A, DRAFT_B, DRAFT_C])
    judge = ScriptedLLM(["Looks great to me!", score(6), json.dumps({"score": "9"})])
    assert optimise(writer, judge, BRIEF) == Best(DRAFT_B, 6, 3)
    assert writer.calls[1]["messages"][0]["content"] == improve_prompt(BRIEF, DRAFT_A, "")
    tie = optimise(ScriptedLLM([DRAFT_A, DRAFT_B]), ScriptedLLM([score(6), score(6)]), BRIEF, max_rounds=2)
    assert tie == Best(DRAFT_A, 6, 2)
