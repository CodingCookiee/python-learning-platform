from plp import hidden, raises, test
from plp_fakes import fake_embed
from solution import VectorIndex

CHUNKS = [
    {"id": "fees#0", "source": "fees.md", "text": "A first assessment costs 65 pounds. Follow-up sessions cost 50 pounds."},
    {"id": "cancellations#0", "source": "cancellations.md", "text": "Cancel at least 24 hours before your appointment to avoid a fee."},
    {"id": "cancellations#1", "source": "cancellations.md", "text": "Late cancellations and missed appointments are charged the full session fee."},
]
MORE = [
    {"id": "insurance#0", "source": "insurance.md", "text": "We accept most major health insurers. Bring your policy number to your first session."},
    {"id": "parking#0", "source": "visiting.md", "text": "There is free parking behind the clinic, and a bus stop outside."},
]


class Recorder:
    def __init__(self, scale=1.0):
        self.calls = []
        self.scale = scale

    def __call__(self, texts):
        self.calls.append(list(texts))
        return [[x * self.scale for x in v] for v in fake_embed(texts)]


def summary(results):
    return [(r["id"], round(r["score"], 3)) for r in results]


@test("Finds the cancellation chunks for a missed appointment")
def _():
    index = VectorIndex(fake_embed)
    index.add(CHUNKS)
    assert summary(index.search("What is the fee for a missed appointment?", k=2)) == [
        ("cancellations#0", 0.615),
        ("cancellations#1", 0.53),
    ]


@test("Embeds each batch of chunks in one call, and each query in one call")
def _():
    embed = Recorder()
    index = VectorIndex(embed)
    index.add(CHUNKS)
    index.add(MORE)
    index.search("Is there free parking?")
    assert embed.calls == [[c["text"] for c in CHUNKS], [c["text"] for c in MORE], ["Is there free parking?"]]
    assert len(index) == 5


@test("Results keep the chunk's metadata and add a float score, without changing the stored chunk")
def _():
    index = VectorIndex(fake_embed)
    index.add(CHUNKS + MORE)
    [top] = index.search("Is there free parking?", k=1)
    assert top["id"] == "parking#0" and top["source"] == "visiting.md" and top["text"] == MORE[1]["text"]
    assert type(top["score"]) is float and round(top["score"], 2) == 0.77
    assert all("score" not in chunk for chunk in CHUNKS + MORE)


@test("Scores are cosines even when the vectors aren't normalised")
def _():
    index = VectorIndex(Recorder(scale=12.0))
    index.add(CHUNKS)
    assert summary(index.search("What is the fee for a missed appointment?", k=2)) == [
        ("cancellations#0", 0.615),
        ("cancellations#1", 0.53),
    ]


@test("Refuses duplicate ids and adds nothing")
def _():
    embed = Recorder()
    index = VectorIndex(embed)
    index.add(CHUNKS)
    raises(ValueError, index.add, [MORE[0], CHUNKS[1]])
    raises(ValueError, index.add, [MORE[0], MORE[0]])
    assert len(index) == 3
    assert len(embed.calls) == 1


@hidden("An empty index or an empty add doesn't call embed, and k can exceed the size")
def _():
    embed = Recorder()
    index = VectorIndex(embed)
    assert index.search("cancel appointment") == []
    index.add([])
    assert embed.calls == [] and len(index) == 0
    index.add(CHUNKS)
    assert [r["id"] for r in index.search("cancel appointment", k=10)] == ["cancellations#0", "cancellations#1", "fees#0"]
