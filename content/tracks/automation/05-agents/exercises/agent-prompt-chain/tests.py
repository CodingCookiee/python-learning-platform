from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import run_chain

TRANSCRIPT = "Priya: we have budget for 20 seats, but we need SSO first. We'll decide by 15 October."
FACTS = "- Budget for 20 seats\n- Needs SSO first\n- Decision by 15 October"
EMAIL = "Hi Priya, thanks for today. We'll confirm SSO timing by Friday so you can decide by 15 October."
STEPS = ["List the facts from this sales call as bullets:\n{input}",
         "Write a two-sentence follow-up email from these facts:\n{input}"]


@test("Runs the example chain")
def _():
    llm = ScriptedLLM([FACTS + "\n", "  " + EMAIL])
    assert run_chain(llm, STEPS, TRANSCRIPT) == EMAIL
    assert len(llm.calls) == 2


@test("Each step's reply becomes the next step's input")
def _():
    llm = ScriptedLLM([FACTS + "\n\n", EMAIL])
    run_chain(llm, STEPS, TRANSCRIPT, system="You work for Northwind's sales team.")
    assert [call["messages"] for call in llm.calls] == [
        [{"role": "user", "content": STEPS[0].replace("{input}", TRANSCRIPT)}],
        [{"role": "user", "content": STEPS[1].replace("{input}", FACTS)}],
    ]
    assert [call["system"] for call in llm.calls] == ["You work for Northwind's sales team."] * 2


@test("Templates can contain other braces")
def _():
    llm = ScriptedLLM(['{"seats": 20}'])
    assert run_chain(llm, ['Return JSON like {"seats": 0} for: {input}'], TRANSCRIPT) == '{"seats": 20}'
    assert llm.calls[0]["messages"][0]["content"] == 'Return JSON like {"seats": 0} for: ' + TRANSCRIPT


@hidden("Three steps, and no steps")
def _():
    llm = ScriptedLLM(["one", "two", "three"])
    assert run_chain(llm, ["a {input}", "b {input}", "c {input}"], "zero") == "three"
    assert llm.calls[2]["messages"][0]["content"] == "c two"
    assert run_chain(ScriptedLLM([]), [], "  unchanged  ") == "  unchanged  "
