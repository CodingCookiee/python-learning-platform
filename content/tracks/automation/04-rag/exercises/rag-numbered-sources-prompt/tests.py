from plp import hidden, raises, test
from solution import SYSTEM, build_prompt

DEPOSITS = [
    {"id": "deposits#0", "title": "Deposit protection",
     "text": "Your landlord must protect your deposit in a government-approved scheme within 30 days of receiving it."},
    {"id": "deposits#1", "title": "Unprotected deposits",
     "text": "If your deposit isn't protected, you can claim between one and three times its value at court."},
]
QUESTION = "How long does my landlord have to protect my deposit?"
EXPECTED = """<sources>
<source id="1" title="Deposit protection">
Your landlord must protect your deposit in a government-approved scheme within 30 days of receiving it.
</source>
<source id="2" title="Unprotected deposits">
If your deposit isn't protected, you can claim between one and three times its value at court.
</source>
</sources>

Question: How long does my landlord have to protect my deposit?"""


@test("Builds the user message for the deposit question")
def _():
    system, messages = build_prompt(QUESTION, DEPOSITS)
    assert messages == [{"role": "user", "content": EXPECTED}]


@test("The system prompt is the fixed rules, with no sources in it")
def _():
    system, _ = build_prompt(QUESTION, DEPOSITS)
    assert system == SYSTEM
    assert "30 days" not in system and "<source" not in system


@test("Numbers the sources from 1, in order")
def _():
    chunks = [{"title": f"Notice rule {n}", "text": f"Rule text {n}."} for n in range(1, 5)]
    _, messages = build_prompt("What notice do I get?", chunks)
    content = messages[0]["content"]
    positions = [content.index(f'<source id="{n}" title="Notice rule {n}">\nRule text {n}.\n</source>') for n in range(1, 5)]
    assert positions == sorted(positions)
    assert '<source id="0"' not in content


@test("Refuses to build a prompt with no sources")
def _():
    raises(ValueError, build_prompt, QUESTION, [])


@hidden("Works with a single source and extra chunk fields")
def _():
    chunk = {"id": "repairs#0", "source": "repairs.md", "title": "Asking for repairs", "text": "Report repairs in writing."}
    _, messages = build_prompt("How do I ask for repairs?", [chunk])
    assert messages[0]["content"] == (
        '<sources>\n<source id="1" title="Asking for repairs">\nReport repairs in writing.\n</source>\n</sources>\n\n'
        "Question: How do I ask for repairs?"
    )
