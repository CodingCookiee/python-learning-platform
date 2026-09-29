from plp import hidden, raises, test
from plp_fakes import ScriptedLLM
from solution import CLIENT_SYSTEM, COACH_SYSTEM, rehearse

CLINIC = {
    "role": "practice manager",
    "business": "a three-dentist clinic",
    "pain": "reception spends every morning phoning patients about appointments",
    "budget": "a few thousand, if it pays back within the year",
    "hidden": "the dentists refused the last new system",
}
QUESTIONS = ["How many reminders do you send?", "What worries you about changing it?"]
ANSWERS = ["About forty a week, mostly by phone.", "Honestly, I'm worried the dentists won't use anything new."]
FEEDBACK = "Good: you asked about volume early. Missing: what a no-show costs. You found the concern."


def scripted():
    return ScriptedLLM([*ANSWERS, FEEDBACK])


@test("Plays the call and returns the transcript and the feedback")
def _():
    result = rehearse(scripted(), CLINIC, QUESTIONS)
    assert result["transcript"][0] == ("How many reminders do you send?", "About forty a week, mostly by phone.")
    assert result == {"transcript": list(zip(QUESTIONS, ANSWERS)), "feedback": FEEDBACK}


@test("The client plays the persona, at temperature 0.7")
def _():
    llm = scripted()
    rehearse(llm, CLINIC, QUESTIONS)
    assert len(llm.calls) == 3
    for call in llm.calls[:2]:
        assert call["system"] == CLIENT_SYSTEM.format(**CLINIC)
        assert call["temperature"] == 0.7


@test("Each question is asked with the conversation so far")
def _():
    llm = scripted()
    rehearse(llm, CLINIC, QUESTIONS)
    assert llm.calls[1]["messages"] == [
        {"role": "user", "content": QUESTIONS[0]},
        {"role": "assistant", "content": ANSWERS[0]},
        {"role": "user", "content": QUESTIONS[1]},
    ]


@test("The coach reads the transcript in a fresh conversation")
def _():
    llm = scripted()
    rehearse(llm, CLINIC, QUESTIONS)
    coach = llm.calls[2]
    assert coach["system"] == COACH_SYSTEM.format(hidden=CLINIC["hidden"])
    assert coach["temperature"] == 0
    assert coach["messages"] == [{"role": "user", "content": (
        "You: How many reminders do you send?\n"
        "Client: About forty a week, mostly by phone.\n"
        "You: What worries you about changing it?\n"
        "Client: Honestly, I'm worried the dentists won't use anything new."
    )}]


@hidden("Refuses to rehearse with no questions, without calling the model")
def _():
    llm = ScriptedLLM([])
    raises(ValueError, rehearse, llm, CLINIC, [])
    assert llm.calls == []


@hidden("Works for a single question")
def _():
    llm = ScriptedLLM(["Yes, I sign off anything under five thousand.", "Short, but you found the authority."])
    result = rehearse(llm, CLINIC, ["Who signs off on this?"])
    assert result["transcript"] == [("Who signs off on this?", "Yes, I sign off anything under five thousand.")]
    assert llm.calls[1]["messages"][0]["content"] == (
        "You: Who signs off on this?\nClient: Yes, I sign off anything under five thousand.")
