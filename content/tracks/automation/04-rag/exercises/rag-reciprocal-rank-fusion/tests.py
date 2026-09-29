import math

from plp import hidden, test
from solution import rrf

VECTOR = ["xero-export", "csv-export", "e-4012"]
KEYWORD = ["e-4012", "e-2001", "xero-export"]


def rounded(pairs):
    return [(doc_id, round(score, 4)) for doc_id, score in pairs]


@test("Fuses the vector and keyword rankings")
def _():
    assert rounded(rrf([VECTOR, KEYWORD])) == [
        ("xero-export", 0.0323), ("e-4012", 0.0323), ("csv-export", 0.0161), ("e-2001", 0.0161),
    ]


@test("Scores are exact sums of 1 / (k + rank)")
def _():
    fused = dict(rrf([VECTOR, KEYWORD], k=10))
    assert math.isclose(fused["xero-export"], 1 / 11 + 1 / 13)
    assert math.isclose(fused["e-2001"], 1 / 12)


@test("A document both rankings like beats one ranked first by only one")
def _():
    vector = ["e-2001", "e-4012", "xero-export", "csv-export", "reminders"]
    keyword = ["e-2001", "reminders"]
    assert [doc_id for doc_id, _ in rrf([vector, keyword])][:3] == ["e-2001", "reminders", "e-4012"]


@test("Works for one ranking, three rankings, or none")
def _():
    assert [doc_id for doc_id, _ in rrf([["prefix", "reminders"]])] == ["prefix", "reminders"]
    three = rrf([["a-1", "b-2"], ["b-2", "c-3"], ["b-2", "a-1"]])
    assert [doc_id for doc_id, _ in three] == ["b-2", "a-1", "c-3"]
    assert rrf([]) == []


@hidden("A repeated id only counts its best position in that ranking")
def _():
    fused = dict(rrf([["prefix", "reminders", "prefix"], ["reminders"]], k=60))
    assert math.isclose(fused["prefix"], 1 / 61)
    assert math.isclose(fused["reminders"], 1 / 62 + 1 / 61)
