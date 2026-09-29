from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import LEAD_SYSTEM, classify_lead, lead_messages

EXAMPLES = [
    ("We need 40 bikes for our delivery fleet by March. Budget approved.", "hot"),
    ("Just browsing prices for a team offsite next year.", "cold"),
]
LEAD = "Can you quote 12 cargo bikes for next month?"


def lead(text):
    return {"role": "user", "content": f"<lead>\n{text}\n</lead>"}


@test("Classifies a lead, like the example")
def _():
    assert classify_lead(ScriptedLLM(["Hot."]), LEAD, EXAMPLES) == "hot"


@test("Builds the few-shot conversation in order")
def _():
    assert lead_messages("Can you quote 12 cargo bikes?", EXAMPLES) == [
        lead(EXAMPLES[0][0]),
        {"role": "assistant", "content": "hot"},
        lead(EXAMPLES[1][0]),
        {"role": "assistant", "content": "cold"},
        lead("Can you quote 12 cargo bikes?"),
    ]


@test("Sends those messages with the system prompt, max_tokens 5 and temperature 0")
def _():
    llm = ScriptedLLM(["warm"])
    classify_lead(llm, LEAD, EXAMPLES)
    call = llm.calls[0]
    assert call["messages"] == lead_messages(LEAD, EXAMPLES)
    assert (call["system"], call["max_tokens"], call["temperature"]) == (LEAD_SYSTEM, 5, 0)


@test("Normalises the answer")
def _():
    replies = [" warm\n", "COLD", "Hot!"]
    llm = ScriptedLLM(replies)
    assert [classify_lead(llm, LEAD, EXAMPLES) for _ in replies] == ["warm", "cold", "hot"]


@test("Anything that isn't a label is unknown")
def _():
    replies = ["Probably warm", "lukewarm", ""]
    llm = ScriptedLLM(replies)
    assert [classify_lead(llm, LEAD, EXAMPLES) for _ in replies] == ["unknown", "unknown", "unknown"]


@hidden("Works with no examples at all")
def _():
    assert lead_messages(LEAD, []) == [lead(LEAD)]
    assert classify_lead(ScriptedLLM(["cold"]), "I'm a student writing about bikes.", []) == "cold"
