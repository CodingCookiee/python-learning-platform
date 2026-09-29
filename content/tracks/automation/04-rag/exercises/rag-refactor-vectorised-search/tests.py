import numpy as np
from plp import hidden, test
from solution import PolicySearch

# Built once, outside the time limit: 20,000 chunk vectors of 64 floats, and 30 questions
_rng = np.random.default_rng(314)
BIG_VECTORS = (_rng.normal(size=(20_000, 64)) * _rng.uniform(0.5, 3.0, size=(20_000, 1))).tolist()
BIG_IDS = [f"policy#{n}" for n in range(20_000)]
QUESTIONS = _rng.normal(size=(30, 64)).tolist()

_matrix = np.asarray(BIG_VECTORS)
_unit = _matrix / np.linalg.norm(_matrix, axis=1, keepdims=True)
EXPECTED_FIRST = [BIG_IDS[int(i)] for i in np.argsort(-(_unit @ (np.asarray(QUESTIONS[0]) / np.linalg.norm(QUESTIONS[0]))))[:5]]


@test("Answers the example")
def _():
    search = PolicySearch([[3.0, 4.0], [1.0, 0.0], [0.0, 2.0]], ["fees#0", "cancellations#0", "parking#0"])
    assert search.search([1.0, 1.0], k=2) == [("fees#0", 0.989949), ("cancellations#0", 0.707107)]


@test("Ties keep their order, and zero vectors score 0.0")
def _():
    search = PolicySearch([[0.0, 0.0], [2.0, 0.0], [5.0, 0.0], [0.0, 1.0]], ["a#0", "b#0", "c#0", "d#0"])
    assert search.search([1.0, 0.0], k=4) == [("b#0", 1.0), ("c#0", 1.0), ("a#0", 0.0), ("d#0", 0.0)]
    assert search.search([0.0, 0.0], k=2) == [("a#0", 0.0), ("b#0", 0.0)]


@test("Scores are plain floats, and k larger than the corpus returns everything")
def _():
    search = PolicySearch([[1.0, 2.0], [2.0, 1.0]], ["fees#0", "fees#1"])
    results = search.search([1.0, 2.0], k=10)
    assert [chunk_id for chunk_id, _ in results] == ["fees#0", "fees#1"]
    assert all(type(score) is float for _, score in results)


@test("Answers 30 questions over 20,000 chunks within the time limit")
def _():
    search = PolicySearch(BIG_VECTORS, BIG_IDS)
    results = [search.search(question, k=5) for question in QUESTIONS]
    assert [chunk_id for chunk_id, _ in results[0]] == EXPECTED_FIRST
    assert all(len(r) == 5 for r in results)


@hidden("The query can be a list or a numpy array")
def _():
    search = PolicySearch([[3.0, 4.0], [1.0, 0.0]], ["fees#0", "cancellations#0"])
    assert search.search(np.array([1.0, 1.0]), k=1) == [("fees#0", 0.989949)]
