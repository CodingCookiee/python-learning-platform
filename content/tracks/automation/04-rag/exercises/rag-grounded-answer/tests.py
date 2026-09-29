import re

from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import REFUSAL, SYSTEM, Answer, answer_question

PROTECTION = {"id": "deposits#0", "title": "Deposit protection",
              "text": "Your landlord must protect your deposit in a government-approved scheme within 30 days of receiving it."}
UNPROTECTED = {"id": "deposits#1", "title": "Unprotected deposits",
               "text": "If your deposit isn't protected, you can claim between one and three times its value at court."}
REPAIRS = {"id": "repairs#0", "title": "Asking for repairs", "text": "Report repairs to your landlord in writing and keep a copy."}
QUESTION = "How long does my landlord have to protect my deposit?"


class Search:
    """A scripted search that records what it was asked."""

    def __init__(self, results):
        self.results = results
        self.calls = []

    def __call__(self, question, k):
        self.calls.append((question, k))
        return self.results[:k]


def answer_from_sources(request):
    """A fake model that answers from whichever numbered source mentions 30 days."""
    content = request["messages"][-1]["content"]
    for n, text in re.findall(r'<source id="(\d+)"[^>]*>\n(.*?)\n</source>', content, re.S):
        if "30 days" in text:
            return f"Your landlord must protect it within 30 days [{n}]."
    return REFUSAL


@test("Answers the deposit question with a citation")
def _():
    llm = ScriptedLLM(["Your landlord must protect it within 30 days [1]."])
    search = Search([(PROTECTION, 0.82), (UNPROTECTED, 0.64)])
    assert answer_question(QUESTION, search, llm) == Answer(
        text="Your landlord must protect it within 30 days [1].", citations=["deposits#0"], refused=False
    )


@test("Sends the retrieved chunks as numbered sources, with the rules as the system prompt")
def _():
    llm = ScriptedLLM([answer_from_sources])
    search = Search([(REPAIRS, 0.5), (UNPROTECTED, 0.45), (PROTECTION, 0.44)])
    result = answer_question(QUESTION, search, llm, k=3)
    assert search.calls == [(QUESTION, 3)]
    assert llm.calls[0]["system"] == SYSTEM
    assert llm.calls[0]["temperature"] == 0
    assert '<source id="3" title="Deposit protection">' in llm.calls[0]["messages"][0]["content"]
    assert result == Answer("Your landlord must protect it within 30 days [3].", ["deposits#0"], False)


@test("Refuses without calling the model when retrieval is weak or empty")
def _():
    llm = ScriptedLLM([])
    assert answer_question("Can I keep a cat?", Search([(REPAIRS, 0.12)]), llm) == Answer(REFUSAL, [], True)
    assert answer_question("Can I keep a cat?", Search([]), llm) == Answer(REFUSAL, [], True)
    assert llm.calls == []


@test("Passes on the model's refusal")
def _():
    llm = ScriptedLLM([answer_from_sources])
    result = answer_question("Can I keep a cat?", Search([(REPAIRS, 0.4), (UNPROTECTED, 0.35)]), llm)
    assert result == Answer(REFUSAL, [], True)


@test("An answer with no valid citation is a refusal")
def _():
    for reply in ("Landlords have 30 days.", "Landlords have 30 days [4].", "Landlords have 30 days [0]."):
        llm = ScriptedLLM([reply])
        result = answer_question(QUESTION, Search([(PROTECTION, 0.8), (UNPROTECTED, 0.6)]), llm)
        assert result == Answer(REFUSAL, [], True), f"for the reply {reply!r}"


@hidden("Keeps valid citations in order, once each, and strips the reply")
def _():
    llm = ScriptedLLM(["  Protect it within 30 days [2]; if not, claim up to three times [1, 2][9].\n"])
    result = answer_question(QUESTION, Search([(UNPROTECTED, 0.7), (PROTECTION, 0.69)]), llm, min_score=0.5)
    assert result == Answer("Protect it within 30 days [2]; if not, claim up to three times [1, 2][9].",
                            ["deposits#0", "deposits#1"], False)
