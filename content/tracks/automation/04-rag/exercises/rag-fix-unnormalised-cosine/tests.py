import numpy as np
from plp import hidden, test
from solution import rank, similarity_scores

QUERY = [1.0, 1.0, 0.0]
DOCS = [[1.0, 1.0, 0.0], [3.0, 2.0, 6.0]]


@test("The on-topic answer beats the long appendix")
def _():
    assert np.round(similarity_scores(QUERY, DOCS), 3).tolist() == [1.0, 0.505]
    assert rank(QUERY, DOCS) == [0, 1]


@test("Scaling a document vector doesn't change its score")
def _():
    docs = [[0.6, 0.8, 0.0], [60.0, 80.0, 0.0], [0.0, 0.0, 0.1]]
    scores = np.round(similarity_scores([3.0, 4.0, 0.0], docs), 6).tolist()
    assert scores == [1.0, 1.0, 0.0]


@test("Scaling the query doesn't change the ranking or the scores")
def _():
    docs = [[2.0, 0.0], [1.0, 1.0], [0.0, 5.0]]
    small = np.round(similarity_scores([1.0, 0.2], docs), 6).tolist()
    large = np.round(similarity_scores([100.0, 20.0], docs), 6).tolist()
    assert small == large
    assert rank([100.0, 20.0], docs) == [0, 1, 2]


@test("An all-zero document scores 0.0, not nan")
def _():
    scores = similarity_scores([1.0, 0.0], [[0.0, 0.0], [1.0, 0.0], [-2.0, 0.0]])
    assert not np.isnan(scores).any(), f"got {scores}"
    assert np.round(scores, 6).tolist() == [0.0, 1.0, -1.0]
    assert rank([1.0, 0.0], [[0.0, 0.0], [1.0, 0.0], [-2.0, 0.0]]) == [1, 0, 2]


@hidden("An all-zero query scores everything 0.0")
def _():
    scores = similarity_scores([0.0, 0.0, 0.0], DOCS)
    assert not np.isnan(scores).any(), f"got {scores}"
    assert scores.tolist() == [0.0, 0.0]
