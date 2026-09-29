from plp import hidden, test
from solution import clean_filename


@test("Cleans an invoice name")
def _():
    assert clean_filename("Invoice #1042 (FINAL).PDF") == "invoice-1042-final.pdf"


@test("Collapses runs of spaces and trims the ends")
def _():
    assert clean_filename("  Receipt  Tesco 03-02.jpeg") == "receipt-tesco-03-02.jpeg"


@test("Works without an extension")
def _():
    assert clean_filename("README") == "readme"


@hidden("Leaves an already clean name alone")
def _():
    assert clean_filename("bank-statement-2026-03.pdf") == "bank-statement-2026-03.pdf"


@hidden("Underscores and dots in the name become hyphens")
def _():
    assert clean_filename("IMG_4411 copy.v2.JPG") == "img-4411-copy-v2.jpg"
