import re

from plp import hidden, test
from plp_fakes import ScriptedLLM
from solution import RERANK_SYSTEM, rerank

QUESTION = "What can I do if my landlord never protected my deposit?"
CANDIDATES = [
    {"id": "deposits#0", "text": "Your landlord must protect your deposit in a government-approved scheme within 30 days."},
    {"id": "repairs#0", "text": "Report repairs to your landlord in writing and keep a copy."},
    {"id": "deposits#1", "text": "If your deposit isn't protected, you can claim between one and three times its value."},
]
EXPECTED_PROMPT = (
    "Question: What can I do if my landlord never protected my deposit?\n\n"
    "[1] Your landlord must protect your deposit in a government-approved scheme within 30 days.\n\n"
    "[2] Report repairs to your landlord in writing and keep a copy.\n\n"
    "[3] If your deposit isn't protected, you can claim between one and three times its value."
)


def ids(chunks):
    return [chunk["id"] for chunk in chunks]


@test("Reorders the deposit candidates as the model ranked them")
def _():
    llm = ScriptedLLM(['{"ranking": [3, 1, 2]}'])
    assert ids(rerank(llm, QUESTION, CANDIDATES, top_n=2)) == ["deposits#1", "deposits#0"]


@test("Sends the numbered passages, the rerank system prompt and temperature 0")
def _():
    llm = ScriptedLLM(['{"ranking": [3, 1, 2]}'])
    rerank(llm, QUESTION, CANDIDATES)
    assert len(llm.calls) == 1
    call = llm.calls[0]
    assert call["messages"] == [{"role": "user", "content": EXPECTED_PROMPT}]
    assert call["system"] == RERANK_SYSTEM
    assert call["temperature"] == 0


@test("A ranking computed from the prompt puts the passages that mention unprotected deposits first")
def _():
    def judge(request):
        passages = re.findall(r"\[(\d+)\] (.*)", request["messages"][0]["content"])
        best = [int(n) for n, text in passages if "isn't protected" in text]
        return '{"ranking": %s}' % best

    llm = ScriptedLLM([judge])
    assert ids(rerank(llm, QUESTION, CANDIDATES, top_n=3)) == ["deposits#1", "deposits#0", "repairs#0"]


@test("Drops invalid and repeated numbers, and appends what the model left out")
def _():
    llm = ScriptedLLM(['{"ranking": [2, 7, 2, 0, "3", -1]}'])
    assert ids(rerank(llm, QUESTION, CANDIDATES, top_n=3)) == ["repairs#0", "deposits#0", "deposits#1"]


@test("Keeps the original order when the reply isn't usable")
def _():
    for reply in ("Passage 3 is best.", '{"order": [3, 1]}', '{"ranking": "3, 1, 2"}', "[3, 1, 2]"):
        llm = ScriptedLLM([reply])
        assert ids(rerank(llm, QUESTION, CANDIDATES, top_n=2)) == ["deposits#0", "repairs#0"], f"for the reply {reply!r}"


@hidden("One candidate or none doesn't call the model")
def _():
    llm = ScriptedLLM([])
    assert ids(rerank(llm, QUESTION, CANDIDATES[:1])) == ["deposits#0"]
    assert rerank(llm, QUESTION, []) == []
    assert llm.calls == []
