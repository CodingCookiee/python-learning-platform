from plp import hidden, test
from solution import chunk_by_heading

ARTICLE = """# Invoices

## Numbering
Invoice numbers are sequential.
You can change the prefix in Settings > Invoices.

## Sending
Send an invoice by email, or download it as a PDF."""


@test("Splits the example article into two sections")
def _():
    assert chunk_by_heading(ARTICLE, "invoices.md") == [
        {"id": "invoices.md#0", "source": "invoices.md", "title": "Numbering", "position": 0,
         "text": "Invoice numbers are sequential.\nYou can change the prefix in Settings > Invoices."},
        {"id": "invoices.md#1", "source": "invoices.md", "title": "Sending", "position": 1,
         "text": "Send an invoice by email, or download it as a PDF."},
    ]


@test("Keeps paragraphs within a section together")
def _():
    doc = "## Reminders\nThe first goes after 3 days.\n\nThe second goes after 10 days.\n## Credit notes\nIssue one from the invoice."
    assert [(c["title"], c["text"]) for c in chunk_by_heading(doc, "reminders.md")] == [
        ("Reminders", "The first goes after 3 days.\n\nThe second goes after 10 days."),
        ("Credit notes", "Issue one from the invoice."),
    ]


@test("Text before the first heading has an empty title")
def _():
    doc = "Ledgerline sends invoices for you.\n\n## Pricing\nThe Pro plan is 12 pounds a month."
    assert [(c["title"], c["text"]) for c in chunk_by_heading(doc, "intro.md")] == [
        ("", "Ledgerline sends invoices for you."),
        ("Pricing", "The Pro plan is 12 pounds a month."),
    ]


@test("Skips empty sections, and positions and ids have no gaps")
def _():
    doc = "# Tax\n\n## VAT\n\n## Rates\nStandard rate is 20%.\n### Reduced rate\n   \n## Zero rate\nBooks are zero-rated."
    chunks = chunk_by_heading(doc, "tax.md")
    assert [(c["id"], c["title"], c["position"]) for c in chunks] == [
        ("tax.md#0", "Rates", 0),
        ("tax.md#1", "Zero rate", 1),
    ]


@hidden("Recognises all six heading levels, strips titles, and ignores # without a space")
def _():
    doc = "###### Deep heading  \nBody one.\n#hashtag is not a heading\n#   Spaced title\nBody two."
    assert [(c["title"], c["text"]) for c in chunk_by_heading(doc, "misc.md")] == [
        ("Deep heading", "Body one.\n#hashtag is not a heading"),
        ("Spaced title", "Body two."),
    ]


@hidden("An empty document has no chunks")
def _():
    assert chunk_by_heading("", "empty.md") == []
    assert chunk_by_heading("# Only a title\n\n", "empty.md") == []
