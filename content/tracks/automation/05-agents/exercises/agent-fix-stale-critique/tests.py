from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import Refined, critique_prompt, refine, revise_prompt

BRIEF = "Invoice INV-2291 to Harbour Dental, 1,450.00, 18 days overdue. Firm but polite."
DRAFT_1 = "Harbour Dental: pay INV-2291 now or we'll take this further."
DRAFT_2 = "Hi Harbour Dental team, invoice INV-2291 is now 18 days overdue. Could you arrange payment this week?"
DRAFT_3 = "Hi Harbour Dental team, invoice INV-2291 for 1,450.00 is now 18 days overdue. Could you arrange payment this week?"
CRITIQUE_1 = "Too aggressive: don't threaten."
CRITIQUE_2 = "Mention the amount."


def content(call):
    return call["messages"][0]["content"]


@test("Approves the third draft, as in the example")
def _():
    llm = ScriptedLLM([DRAFT_1, CRITIQUE_1, DRAFT_2, CRITIQUE_2, DRAFT_3, "APPROVED"])
    assert refine(llm, BRIEF) == Refined(DRAFT_3, 3, True)
    assert len(llm.calls) == 6


@test("Each critique reviews the latest draft")
def _():
    llm = ScriptedLLM([DRAFT_1, CRITIQUE_1, DRAFT_2, CRITIQUE_2, DRAFT_3, "APPROVED"])
    refine(llm, BRIEF)
    assert [content(llm.calls[n]) for n in (1, 3, 5)] == [
        critique_prompt(BRIEF, DRAFT_1), critique_prompt(BRIEF, DRAFT_2), critique_prompt(BRIEF, DRAFT_3)]


@test("Each revision starts from the latest draft")
def _():
    llm = ScriptedLLM([DRAFT_1, CRITIQUE_1, DRAFT_2, CRITIQUE_2, DRAFT_3, "APPROVED"])
    refine(llm, BRIEF)
    assert [content(llm.calls[n]) for n in (2, 4)] == [
        revise_prompt(BRIEF, DRAFT_1, CRITIQUE_1), revise_prompt(BRIEF, DRAFT_2, CRITIQUE_2)]


@test("Out of rounds: the latest draft, not approved")
def _():
    llm = ScriptedLLM([DRAFT_1, CRITIQUE_1, DRAFT_2])
    assert refine(llm, BRIEF, max_rounds=1) == Refined(DRAFT_2, 1, False)


@hidden("A first draft that's approved needs no revision")
def _():
    llm = ScriptedLLM([DRAFT_3, "APPROVED"])
    assert refine(llm, BRIEF) == Refined(DRAFT_3, 1, True)
    assert len(llm.calls) == 2
