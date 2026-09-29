from plp import hidden, raises, test
from solution import evaluate_retrieval

RESULTS = {
    "What does a follow-up session cost?": ["fees#0", "fees#1", "cancellations#0", "insurance#0", "parking#0"],
    "What if I miss my appointment?": ["parking#0", "cancellations#1", "cancellations#0", "fees#0", "hours#0"],
    "When are you open on Saturdays?": ["insurance#0", "fees#0", "parking#0", "hours#0", "fees#1"],
    "Do you treat horses?": ["parking#0", "fees#0", "hours#0", "insurance#0", "fees#1"],
}
QUESTIONS = [
    {"id": "q1", "question": "What does a follow-up session cost?", "relevant": ["fees#1"]},
    {"id": "q2", "question": "What if I miss my appointment?", "relevant": ["cancellations#0", "cancellations#1"]},
    {"id": "q3", "question": "When are you open on Saturdays?", "relevant": ["hours#0"]},
    {"id": "q4", "question": "Do you treat horses?", "relevant": []},
]


class Search:
    def __init__(self, results=RESULTS):
        self.results = results
        self.calls = []

    def __call__(self, question, k):
        self.calls.append((question, k))
        return self.results[question]  # returns five, whatever k is


@test("Scores the clinic's eval set at k=3")
def _():
    assert evaluate_retrieval(QUESTIONS, Search(), k=3) == {"recall@3": 0.667, "mrr": 0.333, "misses": ["q3"]}


@test("Searches each answerable question once, with k, and skips the unanswerable one")
def _():
    search = Search()
    evaluate_retrieval(QUESTIONS, search, k=3)
    assert search.calls == [(q["question"], 3) for q in QUESTIONS[:3]]


@test("Only the first k results count, even if search returns more")
def _():
    assert evaluate_retrieval(QUESTIONS, Search(), k=1) == {"recall@1": 0.0, "mrr": 0.0, "misses": ["q1", "q2", "q3"]}
    assert evaluate_retrieval(QUESTIONS, Search(), k=5) == {"recall@5": 1.0, "mrr": 0.417, "misses": []}


@test("Counts partial recall for questions with several relevant chunks")
def _():
    assert evaluate_retrieval(QUESTIONS[1:2], Search(), k=2) == {"recall@2": 0.5, "mrr": 0.5, "misses": []}


@test("Refuses a question set with nothing answerable")
def _():
    raises(ValueError, evaluate_retrieval, QUESTIONS[3:], Search())


@hidden("A relevant id listed twice still counts once")
def _():
    questions = [{"id": "q2", "question": "What if I miss my appointment?", "relevant": ["cancellations#1", "cancellations#1"]}]
    assert evaluate_retrieval(questions, Search(), k=2) == {"recall@2": 1.0, "mrr": 0.5, "misses": []}
