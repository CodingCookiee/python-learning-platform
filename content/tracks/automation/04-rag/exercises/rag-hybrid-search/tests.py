from plp import hidden, test
from plp_fakes import cosine, fake_embed
from solution import hybrid_search

ARTICLES = [
    {"id": "xero-export", "text": "Exporting to Xero: connect your Xero account in Settings, then export invoices."},
    {"id": "e-4012", "text": "Error E-4012 means the Xero connection expired. Reconnect Xero and export again."},
    {"id": "csv-export", "text": "Exporting to CSV: download all invoices as a spreadsheet."},
    {"id": "e-2001", "text": "Error E-2001 means a card payment failed. Ask the client to update their card."},
    {"id": "reminders", "text": "Payment reminders are sent 3 and 10 days after the due date."},
    {"id": "prefix", "text": "Change the invoice number prefix in Settings, under Invoices."},
]


class Recorder:
    def __init__(self, scale=1.0):
        self.calls = []
        self.scale = scale

    def __call__(self, texts):
        self.calls.append(list(texts))
        return [[x * self.scale for x in v] for v in fake_embed(texts)]


@test("Lifts the chunk both searches found")
def _():
    assert hybrid_search("card payment failed", ARTICLES, fake_embed, k=3) == ["e-2001", "reminders", "e-4012"]


@test("Embeds the query and every chunk in one call")
def _():
    embed = Recorder()
    hybrid_search("card payment failed", ARTICLES, embed)
    assert embed.calls == [["card payment failed", *(a["text"] for a in ARTICLES)]]


@test("candidates limits each ranking before fusing")
def _():
    # reminders is fifth by vector similarity, so with 3 candidates only BM25 finds it
    assert hybrid_search("card payment failed", ARTICLES, fake_embed, k=4, candidates=3) == [
        "e-2001", "e-4012", "reminders", "xero-export",
    ]
    assert hybrid_search("Error E-4012 when I export to Xero", ARTICLES, fake_embed, k=4, candidates=3) == [
        "e-4012", "xero-export", "reminders", "e-2001",
    ]


@test("Works with vectors that aren't unit length")
def _():
    assert hybrid_search("card payment failed", ARTICLES, Recorder(scale=9.0), k=3) == ["e-2001", "reminders", "e-4012"]


@hidden("With BM25 finding nothing, the vector ranking decides; with no chunks, nothing is embedded")
def _():
    query = "opening hours"
    [query_vector, *vectors] = fake_embed([query, *(a["text"] for a in ARTICLES)])
    by_cosine = sorted(range(len(ARTICLES)), key=lambda i: -round(cosine(query_vector, vectors[i]), 9))
    assert hybrid_search(query, ARTICLES, fake_embed, k=3) == [ARTICLES[i]["id"] for i in by_cosine[:3]]
    embed = Recorder()
    assert hybrid_search("card payment failed", [], embed) == []
    assert embed.calls == []
