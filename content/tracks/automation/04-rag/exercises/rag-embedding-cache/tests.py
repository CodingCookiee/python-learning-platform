from plp import hidden, raises, test
from plp_fakes import fake_embed
from solution import CachedEmbedder


class Recorder:
    def __init__(self):
        self.calls = []

    def __call__(self, texts):
        self.calls.append(list(texts))
        return fake_embed(texts)


@test("Only embeds the text it hasn't seen")
def _():
    embed = Recorder()
    cached = CachedEmbedder(embed, model="fake-64")
    cached(["Cancel 24 hours ahead.", "Parking is free."])
    cached(["Parking is free.", "Fees are listed below.", "Parking is free."])
    assert embed.calls == [["Cancel 24 hours ahead.", "Parking is free."], ["Fees are listed below."]]
    assert len(cached) == 3


@test("Returns one vector per text, in order, identical to embedding directly")
def _():
    cached = CachedEmbedder(Recorder(), model="fake-64")
    cached(["Parking is free."])
    texts = ["Fees are listed below.", "Parking is free.", "Fees are listed below."]
    assert cached(texts) == fake_embed(texts)


@test("A fully cached call doesn't call embed")
def _():
    embed = Recorder()
    cached = CachedEmbedder(embed, model="fake-64")
    cached(["Cancel 24 hours ahead.", "Parking is free."])
    cached(["Parking is free.", "Cancel 24 hours ahead."])
    assert len(embed.calls) == 1


@test("Sends new texts in batches of at most batch_size, each once, in first-appearance order")
def _():
    embed = Recorder()
    cached = CachedEmbedder(embed, model="fake-64", batch_size=3)
    texts = [f"Policy paragraph {n}" for n in range(1, 8)]
    cached(texts[:1])
    cached(texts + texts[2:4])
    assert embed.calls == [texts[:1], texts[1:4], texts[4:7]]


@test("The model is part of the key in a shared store")
def _():
    store = {}
    first, second = Recorder(), Recorder()
    CachedEmbedder(first, model="fake-64", store=store)(["Parking is free."])
    CachedEmbedder(second, model="fake-64-v2", store=store)(["Parking is free."])
    CachedEmbedder(second, model="fake-64", store=store)(["Parking is free."])
    assert second.calls == [["Parking is free."]]
    assert len(store) == 2


@hidden("A reply with the wrong number of vectors raises and stores nothing")
def _():
    def short(texts):
        return fake_embed(texts)[:-1]

    cached = CachedEmbedder(short, model="fake-64")
    raises(ValueError, cached, ["Cancel 24 hours ahead.", "Parking is free."])
    assert len(cached) == 0


@hidden("An empty store passed in is the one used")
def _():
    store = {}
    cached = CachedEmbedder(Recorder(), model="fake-64", store=store)
    cached(["Parking is free."])
    assert len(store) == 1
