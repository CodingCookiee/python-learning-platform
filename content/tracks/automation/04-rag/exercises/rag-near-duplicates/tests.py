from plp import hidden, test
from plp_fakes import fake_embed
from solution import near_duplicates

TEXTS = [
    "How do I cancel an appointment? Call reception at least 24 hours before.",
    "Opening hours: we are open 8am to 8pm on weekdays.",
    "To cancel an appointment, call reception at least 24 hours before.",
    "Is there parking at the clinic? Free parking is behind the building.",
    "We are open 8am to 8pm on weekdays, and 9am to 1pm on Saturdays.",
    "Parking: there is free parking behind the clinic building.",
]


class Recorder:
    def __init__(self, scale=1.0):
        self.calls = []
        self.scale = scale

    def __call__(self, texts):
        self.calls.append(list(texts))
        return [[x * self.scale for x in v] for v in fake_embed(texts)]


@test("Finds the two duplicated FAQ entries")
def _():
    assert near_duplicates(TEXTS, fake_embed, threshold=0.85) == [(3, 5, 1.0), (0, 2, 0.9)]


@test("A lower threshold finds the opening-hours pair too")
def _():
    assert near_duplicates(TEXTS, fake_embed, threshold=0.6) == [(3, 5, 1.0), (0, 2, 0.9), (1, 4, 0.64)]


@test("Embeds everything in one call, and works on unnormalised vectors")
def _():
    embed = Recorder(scale=3.0)
    assert near_duplicates(TEXTS, embed, threshold=0.85) == [(3, 5, 1.0), (0, 2, 0.9)]
    assert embed.calls == [TEXTS]


@test("Scores are plain floats, and every pair has i < j")
def _():
    pairs = near_duplicates(TEXTS, fake_embed, threshold=-1.0)
    assert len(pairs) == 15
    assert all(type(i) is int and type(j) is int and i < j for i, j, _ in pairs)
    assert all(type(score) is float for _, _, score in pairs)


@hidden("Ties are sorted by i, then j")
def _():
    texts = ["Free parking behind the clinic.", "Opening hours are 8am to 8pm.",
             "Free parking behind the clinic.", "Free parking behind the clinic."]
    assert near_duplicates(texts, fake_embed, threshold=0.99) == [(0, 2, 1.0), (0, 3, 1.0), (2, 3, 1.0)]


@hidden("Fewer than two texts have no pairs")
def _():
    assert near_duplicates([], fake_embed) == []
    assert near_duplicates(["Opening hours are 8am to 8pm."], fake_embed) == []
