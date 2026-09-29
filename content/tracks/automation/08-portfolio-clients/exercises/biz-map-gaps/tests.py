from plp import hidden, test
from solution import process_gaps

RECALLS = {
    "trigger": "A patient is due a six-month check-up",
    "context": {"last visit": "Dentally", "phone": "Dentally"},
    "decisions": [
        {"rule": "Text them if they allow SMS", "uses": ["sms consent", "phone"]},
        {"rule": "Otherwise post a letter", "uses": ["address"]},
    ],
    "actions": ["Send the text or letter", "Log it on the patient record"],
}

COMPLETE = {
    **RECALLS,
    "volume": "About 120 a month, 5 minutes each",
    "context": {"last visit": "Dentally", "phone": "Dentally", "sms consent": "Dentally", "address": "Dentally"},
    "fallback": "Add them to the receptionist's call list",
    "owner": "Practice manager",
}


@test("Finds the gaps in the clinic's recall process")
def _():
    assert process_gaps(RECALLS) == [
        "How often does it happen, and how long does it take each time?",
        "Where does 'sms consent' come from?",
        "Where does 'address' come from?",
        "What happens when none of the rules fit?",
        "Who notices if it stops working?",
    ]


@test("A complete map has no questions left")
def _():
    assert process_gaps(COMPLETE) == []


@test("An empty map asks every basic question, but not about a fallback")
def _():
    assert process_gaps({}) == [
        "What starts this process?",
        "How often does it happen, and how long does it take each time?",
        "What information does the person look at?",
        "How do they decide what to do?",
        "What changes, and in which system, when it's done?",
        "Who notices if it stops working?",
    ]


@hidden("Blank strings, None and empty collections count as missing")
def _():
    sketchy = {**COMPLETE, "trigger": "   ", "owner": None, "actions": []}
    assert process_gaps(sketchy) == [
        "What starts this process?",
        "What changes, and in which system, when it's done?",
        "Who notices if it stops working?",
    ]


@hidden("Asks about each missing field once, in the order the rules first use it")
def _():
    process = {
        **COMPLETE,
        "context": {},
        "decisions": [
            {"rule": "Urgent if in pain", "uses": ["symptoms", "age"]},
            {"rule": "Children first", "uses": ["age", "guardian phone"]},
        ],
    }
    assert process_gaps(process) == [
        "What information does the person look at?",
        "Where does 'symptoms' come from?",
        "Where does 'age' come from?",
        "Where does 'guardian phone' come from?",
    ]


@hidden("Doesn't change the map it was given")
def _():
    process = {"decisions": [{"rule": "Always", "uses": ["email"]}]}
    process_gaps(process)
    assert process == {"decisions": [{"rule": "Always", "uses": ["email"]}]}
