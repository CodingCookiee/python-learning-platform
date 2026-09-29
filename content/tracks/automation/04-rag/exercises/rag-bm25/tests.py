from plp import hidden, test
from solution import BM25

ARTICLES = [
    "Exporting to Xero: connect your Xero account in Settings, then export invoices.",
    "Error E-4012 means the Xero connection expired. Reconnect Xero and export again.",
    "Exporting to CSV: download all invoices as a spreadsheet.",
    "Error E-2001 means a card payment failed. Ask the client to update their card.",
    "Payment reminders are sent 3 and 10 days after the due date.",
    "Change the invoice number prefix in Settings, under Invoices.",
]
QUERY = "Error E-4012 when I export to Xero"


def rounded(values):
    return [round(v, 3) for v in values]


@test("Scores the help articles for the E-4012 message")
def _():
    index = BM25(ARTICLES)
    assert rounded(index.scores(QUERY)) == [2.465, 4.768, 0.0, 0.918, 0.0, 0.0]
    assert [(i, round(s, 3)) for i, s in index.search(QUERY, k=2)] == [(1, 4.768), (0, 2.465)]


@test("search leaves out documents that don't match at all")
def _():
    assert [i for i, _ in BM25(ARTICLES).search(QUERY, k=10)] == [1, 0, 3]
    assert BM25(ARTICLES).search("opening hours") == []


@test("Repeating a term has diminishing returns, controlled by k1")
def _():
    docs = ["Xero Xero Xero Xero Xero Xero Xero Xero", "Connect Xero in Settings", "Download a CSV file", "Reminders go out after 3 days"]
    assert rounded(BM25(docs).scores("xero")) == [1.362, 0.845, 0.0, 0.0]
    assert rounded(BM25(docs, k1=0.5).scores("xero")) == [0.953, 0.77, 0.0, 0.0]


@test("b controls how much a long document is penalised")
def _():
    docs = ["Xero export guide " + "lots of other words here " * 10, "Xero export", "CSV export"]
    assert rounded(BM25(docs, b=0).scores("xero")) == [0.47, 0.47, 0.0]
    assert rounded(BM25(docs, b=0.75).scores("xero")) == [0.263, 0.774, 0.0]
    assert rounded(BM25(docs, b=1).scores("xero")) == [0.23, 0.986, 0.0]


@hidden("A query term counts once however often the query repeats it")
def _():
    index = BM25(ARTICLES)
    assert rounded(index.scores("xero xero xero")) == rounded(index.scores("Xero"))


@hidden("Ties keep document order; empty corpus and empty documents are fine")
def _():
    index = BM25(["Xero export", "CSV export", "Xero export"])
    assert [i for i, _ in index.search("xero")] == [0, 2]
    assert BM25([]).scores("xero") == []
    assert rounded(BM25(["", "Xero"]).scores("xero")) == [0.0, 0.478]
