from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import WRITER, Drafted, code_problems, critic_prompt, revise_prompt, write_prompt, write_reminder

INVOICE = {"number": "INV-2291", "client": "Harbour Dental", "amount": "1,450.00", "days_overdue": 18}
NO_AMOUNT = "Hi Harbour Dental, invoice INV-2291 is 18 days overdue."
CURT = "Hi Harbour Dental, invoice INV-2291 (1,450.00) is overdue. Pay now."
GOOD = "Hi Harbour Dental, invoice INV-2291 (1,450.00) is overdue. Could you pay this week?"


def contents(llm):
    return [call["messages"][0]["content"] for call in llm.calls]


@test("Runs the example: code check, then critic, then approval")
def _():
    llm = ScriptedLLM([NO_AMOUNT, CURT, "- Sounds curt: soften the last sentence.", GOOD, "APPROVED"])
    assert write_reminder(llm, INVOICE) == Drafted(GOOD, 3, True, [])
    assert contents(llm) == [
        write_prompt(INVOICE),
        revise_prompt(INVOICE, NO_AMOUNT, ["Mention the amount 1,450.00."]),
        critic_prompt(INVOICE, CURT),
        revise_prompt(INVOICE, CURT, ["Sounds curt: soften the last sentence."]),
        critic_prompt(INVOICE, GOOD),
    ]
    assert all(call["system"] == WRITER for call in llm.calls)


@test("code_problems finds each mechanical problem, in order")
def _():
    long_text = "INV-2291 1,450.00 " + "please " * 141
    assert code_problems(GOOD, INVOICE) == []
    assert code_problems("Pay up or face LEGAL ACTION.", INVOICE) == [
        "Mention the invoice number INV-2291.", "Mention the amount 1,450.00.", "Don't mention legal action or late fees."]
    assert code_problems(long_text, INVOICE) == ["Keep it to 120 words; this draft has 143."]
    assert code_problems("INV-2291, 1,450.00, plus a Late Fee.", INVOICE) == ["Don't mention legal action or late fees."]


@test("The critic is never asked about a draft that fails the code checks")
def _():
    llm = ScriptedLLM([NO_AMOUNT, NO_AMOUNT, NO_AMOUNT])
    assert write_reminder(llm, INVOICE) == Drafted(NO_AMOUNT, 3, False, ["Mention the amount 1,450.00."])
    assert not any("Review this payment reminder" in text for text in contents(llm))
    assert len(llm.calls) == 3


@test("Out of rounds after a critique: not approved, with the critic's problems")
def _():
    llm = ScriptedLLM([CURT, "Sounds curt.\n\n- Add a sign-off."])
    assert write_reminder(llm, INVOICE, max_rounds=1) == Drafted(CURT, 1, False, ["Sounds curt.", "Add a sign-off."])


@hidden("A good first draft is approved in one round with two calls")
def _():
    llm = ScriptedLLM([GOOD, "  APPROVED \n"])
    assert write_reminder(llm, INVOICE) == Drafted(GOOD, 1, True, [])
    assert len(llm.calls) == 2
