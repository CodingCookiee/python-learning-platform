from plp import hidden, test
from plp_fakes import fake_embed
from solution import pack_context

RANKED = [
    {"id": "leave#0", "text": "Full-time staff get 25 days of annual leave a year, plus bank holidays."},
    {"id": "leave#0-copy", "text": "Full-time staff get 25 days of annual leave a year plus bank holidays."},
    {"id": "leave#2", "text": "You can carry over up to 5 unused days into the next leave year."},
    {"id": "appendix", "text": "Appendix: every leave policy since 2019. " * 12},
    {"id": "leave#3", "text": "Book leave in the HR portal at least two weeks ahead."},
    {"id": "pto#0", "text": "New York staff get 15 days of paid time off."},
]


class Recorder:
    def __init__(self, scale=1.0):
        self.calls = []
        self.scale = scale

    def __call__(self, texts):
        self.calls.append(list(texts))
        return [[x * self.scale for x in v] for v in fake_embed(texts)]


def ids(chunks):
    return [chunk["id"] for chunk in chunks]


@test("Packs the leave chunks into 50 tokens")
def _():
    assert ids(pack_context(RANKED, fake_embed, max_tokens=50)) == ["leave#0", "leave#3", "leave#2"]


@test("Embeds every text once, in rank order")
def _():
    embed = Recorder()
    pack_context(RANKED, embed, max_tokens=50)
    assert embed.calls == [[chunk["text"] for chunk in RANKED]]


@test("Skips a chunk that doesn't fit and keeps going")
def _():
    assert ids(pack_context(RANKED, fake_embed, max_tokens=60)) == ["leave#0", "leave#3", "pto#0", "leave#2"]


@test("With deduplication off, the copy takes up the budget")
def _():
    assert ids(pack_context(RANKED, fake_embed, max_tokens=60, duplicate_threshold=1.01)) == ["leave#0", "leave#2", "leave#0-copy"]


@test("Works with vectors that aren't unit length")
def _():
    assert ids(pack_context(RANKED, Recorder(scale=4.0), max_tokens=50)) == ["leave#0", "leave#3", "leave#2"]


@hidden("Nothing fits, or nothing to pack")
def _():
    assert pack_context(RANKED, fake_embed, max_tokens=10) == []
    embed = Recorder()
    assert pack_context([], embed) == []
    assert embed.calls == []
