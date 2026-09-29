from plp import hidden, test
from solution import tokenise


@test("Tokenises the support message")
def _():
    assert tokenise("Error E-4012 when I export to Xero!") == ["error", "e-4012", "export", "xero"]


@test("Drops punctuation and symbols, and keeps hyphenated words whole")
def _():
    assert tokenise("Where do I change my invoice-number prefix? Look in SETTINGS > Invoices.") == [
        "where", "change", "invoice-number", "prefix", "look", "settings", "invoices",
    ]


@test("Keeps numbers, and splits on anything that isn't a letter or digit")
def _():
    assert tokenise("Reminders: 3 & 10 days (after the due-date)/2026") == [
        "reminders", "3", "10", "days", "after", "due-date", "2026",
    ]


@hidden("A stray or doubled hyphen isn't part of a token, and empty text has none")
def _():
    assert tokenise("-- VAT -- rates: 20%, re--enter") == ["vat", "rates", "20", "re", "enter"]
    assert tokenise("") == []
    assert tokenise("The, and to of!") == []
