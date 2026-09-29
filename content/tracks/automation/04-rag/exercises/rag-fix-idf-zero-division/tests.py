from plp import hidden, test
from solution import idf

DOCS = [["export", "xero", "error"], ["invoice", "error"], ["reminder", "error"]]


@test("Weights a term that's in one document of three")
def _():
    assert round(idf("xero", DOCS), 4) == 0.9808


@test("A term in every document still counts for something")
def _():
    assert round(idf("error", DOCS), 4) == 0.1335


@test("A term in no document doesn't crash, and weighs the most")
def _():
    assert round(idf("vat", DOCS), 4) == 2.0794
    assert idf("vat", DOCS) > idf("xero", DOCS) > idf("error", DOCS) > 0


@hidden("Counts documents, not occurrences, and copes with an empty corpus")
def _():
    docs = [["error", "error", "error"], ["invoice"]]
    assert round(idf("error", docs), 4) == round(idf("invoice", docs), 4) == 0.6931
    assert round(idf("xero", []), 4) == 0.6931
