from plp import hidden, test
from plp_fakes import fake_embed
from solution import VectorIndex

CHUNKS = [
    {"id": "fees#0", "source": "fees.md", "clinic": "all", "text": "A first assessment costs 65 pounds. Follow-up sessions cost 50 pounds."},
    {"id": "fees#1", "source": "fees.md", "clinic": "all", "text": "Card and cash payments are accepted at reception after each session."},
    {"id": "cancellations#0", "source": "cancellations.md", "clinic": "leith", "text": "Cancel at least 24 hours before your appointment to avoid a fee."},
    {"id": "cancellations#1", "source": "cancellations.md", "clinic": "portobello", "text": "Late cancellations and missed appointments are charged the full session fee."},
    {"id": "insurance#0", "source": "insurance.md", "clinic": "all", "text": "We accept most major health insurers. Bring your policy number to your first session."},
    {"id": "parking#0", "source": "visiting.md", "clinic": "leith", "text": "There is free parking behind the clinic, and a bus stop outside."},
]


class Recorder:
    def __init__(self):
        self.calls = []

    def __call__(self, texts):
        self.calls.append(list(texts))
        return fake_embed(texts)


def build(embed=fake_embed):
    index = VectorIndex(embed)
    index.add(CHUNKS)
    return index


def summary(results):
    return [(r["id"], round(r["score"], 3)) for r in results]


@test("Searches only the fee and insurance policies")
def _():
    results = build().search("How much does an assessment cost?", k=3, where={"source": ["fees.md", "insurance.md"]})
    assert summary(results) == [("fees#0", 0.414), ("insurance#0", 0.101), ("fees#1", -0.123)]


@test("Returns k matching chunks even when they score worse than the rest")
def _():
    results = build().search("Is there free parking?", k=2, where={"source": "fees.md"})
    assert [r["id"] for r in results] == ["fees#0", "fees#1"]


@test("Every condition must hold")
def _():
    results = build().search("cancel appointment", k=5, where={"source": "cancellations.md", "clinic": ["leith", "all"]})
    assert [r["id"] for r in results] == ["cancellations#0"]


@test("No match returns [] without embedding the query")
def _():
    embed = Recorder()
    index = build(embed)
    assert index.search("Is there free parking?", where={"clinic": "musselburgh"}) == []
    assert index.search("Is there free parking?", where={"region": "leith"}) == []
    assert len(embed.calls) == 1


@hidden("No filter, or an empty one, searches everything as before")
def _():
    index = build()
    expected = [("parking#0", 0.77), ("cancellations#0", -0.118)]
    assert summary(index.search("Is there free parking?", k=2)) == expected
    assert summary(index.search("Is there free parking?", k=2, where={})) == expected


@hidden("Tuples and sets work like lists")
def _():
    index = build()
    by_tuple = index.search("session fee", k=6, where={"clinic": ("leith", "portobello")})
    by_set = index.search("session fee", k=6, where={"clinic": {"leith", "portobello"}})
    assert sorted(r["id"] for r in by_tuple) == ["cancellations#0", "cancellations#1", "parking#0"]
    assert [r["id"] for r in by_tuple] == [r["id"] for r in by_set]
