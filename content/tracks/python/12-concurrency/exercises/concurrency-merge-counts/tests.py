import pickle
from collections import Counter

from plp import hidden, test
from solution import count_words, merge

TICKETS = [
    "Refund not received",
    "Where is my refund",
    "Card declined again",
    "card DECLINED at checkout",
    "Refund please",
]


@test("Counting in two pieces matches the example")
def _():
    tickets = TICKETS[:3]
    assert merge(map(count_words, [tickets[:2], tickets[2:]])) == Counter({
        "refund": 2, "not": 1, "received": 1, "where": 1, "is": 1, "my": 1, "card": 1, "declined": 1, "again": 1,
    })


@test("count_words lowercases and splits on whitespace")
def _():
    assert count_words(["Card  DECLINED\tcard"]) == Counter({"card": 2, "declined": 1})


@test("Any way of chunking gives the same totals as counting everything")
def _():
    whole = count_words(TICKETS)
    for size in (1, 2, 3, 5):
        pieces = [TICKETS[i:i + size] for i in range(0, len(TICKETS), size)]
        assert merge(map(count_words, pieces)) == whole, f"chunks of {size} gave a different total"


@test("merge doesn't change the counters it's given")
def _():
    first, second = Counter({"refund": 2}), Counter({"refund": 1, "card": 1})
    merge([first, second])
    assert (first, second) == (Counter({"refund": 2}), Counter({"refund": 1, "card": 1}))


@hidden("Merging nothing gives an empty Counter")
def _():
    assert merge([]) == Counter()
    assert isinstance(merge([]), Counter)
    assert count_words([]) == Counter()


@hidden("The functions and their results can be sent to a worker process")
def _():
    worker = pickle.loads(pickle.dumps(count_words))
    result = pickle.loads(pickle.dumps(worker(TICKETS[:2])))
    assert merge(iter([result, count_words(TICKETS[2:])])) == count_words(TICKETS)
