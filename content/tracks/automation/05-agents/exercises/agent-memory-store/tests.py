from plp import hidden, test
from plp_fakes import cosine, fake_embed
from solution import Memory, MemoryStore

FACTS = [
    ("Priya prefers email over phone calls", {"customer": "C-301"}),
    ("Harbour Dental renews their contract in March", {"customer": "C-301"}),
    ("Harbour Dental asked for SSO before renewal", {"customer": "C-301"}),
    ("Tom Reed is the owner of Harbour Dental", {"customer": "C-301"}),
    ("Kiln & Co pays invoices late every quarter", {"customer": "C-302"}),
    ("Sam at Kiln & Co wants a monthly usage report", {"customer": "C-302"}),
]


class CountingEmbed:
    def __init__(self):
        self.batches = []

    def __call__(self, texts):
        self.batches.append(list(texts))
        return fake_embed(texts)


def filled():
    embed = CountingEmbed()
    store = MemoryStore(embed)
    for text, meta in FACTS:
        store.remember(text, **meta)
    return store, embed


def score(query, text):
    return cosine(fake_embed(query)[0], fake_embed(text)[0])


@test("Recalls the example memories, best first")
def _():
    store, _ = filled()
    found = store.recall("When does Harbour Dental renew?")
    assert [m.text for m in found] == ["Harbour Dental renews their contract in March", "Tom Reed is the owner of Harbour Dental"]
    assert all(isinstance(m, Memory) and m.meta == {"customer": "C-301"} for m in found)
    assert abs(found[0].score - score("When does Harbour Dental renew?", FACTS[1][0])) < 1e-9


@test("Embeds each memory once, and only the query when recalling")
def _():
    store, embed = filled()
    assert embed.batches == [[text] for text, _ in FACTS]
    store.recall("How should I contact Priya?")
    store.recall("Does Kiln & Co pay on time?")
    assert embed.batches[-2:] == [["How should I contact Priya?"], ["Does Kiln & Co pay on time?"]]
    assert len(embed.batches) == len(FACTS) + 2
    assert len(store) == 6


@test("Weak matches are left out")
def _():
    store, _ = filled()
    assert store.recall("What is the weather in Leeds?") == []
    assert [m.text for m in store.recall("How should I contact Priya?")] == ["Priya prefers email over phone calls"]


@test("where keeps one customer's memories out of another's conversation")
def _():
    store, _ = filled()
    assert [m.text for m in store.recall("Does Kiln & Co pay on time?", where={"customer": "C-302"})] == [
        "Kiln & Co pays invoices late every quarter", "Sam at Kiln & Co wants a monthly usage report"]
    assert store.recall("Does Kiln & Co pay on time?", where={"customer": "C-301"}) == []


@hidden("k and min_score limit what comes back")
def _():
    store, _ = filled()
    assert [m.text for m in store.recall("what did harbour dental ask for before renewal", k=1)] == [
        "Harbour Dental asked for SSO before renewal"]
    loose = store.recall("what did harbour dental ask for before renewal", k=10, min_score=0.0)
    assert [m.text for m in loose][:3] == ["Harbour Dental asked for SSO before renewal",
                                           "Tom Reed is the owner of Harbour Dental",
                                           "Harbour Dental renews their contract in March"]
    assert all(m.score >= 0.0 for m in loose)
    assert MemoryStore(CountingEmbed()).recall("anything") == []
