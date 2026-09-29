from plp import hidden, test
from solution import pick_questions

BANK = [
    {"text": "Walk me through yesterday. What did you do first?", "topic": "process", "must": True},
    {"text": "How many of these do you handle in a normal week?", "topic": "volume"},
    {"text": "Who else is involved in deciding on this?", "topic": "authority", "must": True},
    {"text": "Where do patients fall through the cracks between booking and their visit?",
     "topic": "pain", "industries": ["Dental", "Physio"]},
    {"text": "Where do orders get stuck between checkout and delivery?", "topic": "pain",
     "industries": ["ecommerce"]},
    {"text": "What do you copy from one system into another?", "topic": "pain"},
    {"text": "When did this last go wrong, and what did it cost?", "topic": "error cost"},
    {"text": "Have you set a budget for this, even a rough range?", "topic": "budget"},
    {"text": "When would you like this working, and why then?", "topic": "timeline"},
]


def texts_about(topic):
    return {q["text"] for q in BANK if q["topic"] == topic}


@test("Picks five questions for a dental clinic")
def _():
    assert pick_questions(BANK, industry="dental", covered={"volume"}, limit=5) == [
        "Walk me through yesterday. What did you do first?",
        "Who else is involved in deciding on this?",
        "Where do patients fall through the cracks between booking and their visit?",
        "When did this last go wrong, and what did it cost?",
        "Have you set a budget for this, even a rough range?",
    ]


@test("Industry-specific questions only go to that industry")
def _():
    picked = pick_questions(BANK, industry="Ecommerce", limit=9)
    assert "Where do orders get stuck between checkout and delivery?" in picked
    assert "Where do patients fall through the cracks between booking and their visit?" not in picked


@test("One question per topic")
def _():
    picked = pick_questions(BANK, industry="logistics", limit=20)
    assert len(picked) == 7
    assert "What do you copy from one system into another?" in picked
    assert len(set(picked) & texts_about("pain")) == 1


@test("Must questions are always asked, even past the limit")
def _():
    assert pick_questions(BANK, industry="dental", limit=1) == [
        "Walk me through yesterday. What did you do first?",
        "Who else is involved in deciding on this?",
    ]


@hidden("Covered topics are skipped, but must questions stay")
def _():
    picked = pick_questions(BANK, industry="dental", covered={"process", "pain", "budget"}, limit=8)
    assert picked == [
        "Walk me through yesterday. What did you do first?",
        "Who else is involved in deciding on this?",
        "How many of these do you handle in a normal week?",
        "When did this last go wrong, and what did it cost?",
        "When would you like this working, and why then?",
    ]


@hidden("Leaves the bank as it was")
def _():
    before = [dict(q) for q in BANK]
    pick_questions(BANK, industry="dental")
    assert BANK == before
