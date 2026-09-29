from plp import hidden, test
from solution import Chunk, chunk_document

HANDBOOK = """# Staff handbook
## Leave
### Annual leave
Full-time staff get 25 days a year, plus bank holidays.
### Parental leave
Speak to HR at least 15 weeks before your due date."""

LONG = """Welcome to Brightwell.
# Staff handbook
## Expenses
Submit receipts within 30 days. Use the expenses app, not email. Claims over 500 pounds need a director's approval. Mileage is paid at 45p a mile. Train travel is standard class unless the journey is over three hours.
## Equipment
### Laptops
Laptops are replaced every three years.
## Remote work
You can work from home up to three days a week."""


@test("Titles the example's chunks with their heading paths")
def _():
    assert [(c.id, c.title) for c in chunk_document(HANDBOOK, "handbook.md")] == [
        ("handbook.md#0", "Staff handbook > Leave > Annual leave"),
        ("handbook.md#1", "Staff handbook > Leave > Parental leave"),
    ]


@test("Returns Chunk dataclasses with every field filled in")
def _():
    first = chunk_document(HANDBOOK, "handbook.md")[0]
    assert first == Chunk(
        id="handbook.md#0", source="handbook.md", title="Staff handbook > Leave > Annual leave",
        position=0, text="Full-time staff get 25 days a year, plus bank holidays.",
    )


@test("A heading replaces earlier headings of the same or deeper level")
def _():
    titles = [c.title for c in chunk_document(LONG, "handbook.md", max_chars=1000)]
    assert titles == [
        "",
        "Staff handbook > Expenses",
        "Staff handbook > Equipment > Laptops",
        "Staff handbook > Remote work",
    ]


@test("Splits long sections into sentence-packed pieces, numbered across the document")
def _():
    chunks = chunk_document(LONG, "handbook.md", max_chars=100)
    expenses = [c.text for c in chunks if c.title == "Staff handbook > Expenses"]
    assert expenses == [
        "Submit receipts within 30 days. Use the expenses app, not email.",
        "Claims over 500 pounds need a director's approval. Mileage is paid at 45p a mile.",
        "Train travel is standard class unless the journey is over three hours.",
    ]
    assert [c.position for c in chunks] == list(range(len(chunks)))
    assert [c.id for c in chunks] == [f"handbook.md#{i}" for i in range(len(chunks))]


@test("for_embedding puts the title above the text")
def _():
    chunks = chunk_document(LONG, "handbook.md", max_chars=1000)
    assert chunks[2].for_embedding() == "Staff handbook > Equipment > Laptops\n\nLaptops are replaced every three years."
    assert chunks[0].for_embedding() == "Welcome to Brightwell."


@hidden("Short sections keep their newlines, and a sentence longer than max_chars stays whole")
def _():
    doc = "## Hours\nOpen 9 to 5.\nClosed on bank holidays.\n## Security\nAlways lock your screen when you leave your desk, even for a minute, because client files are confidential."
    chunks = chunk_document(doc, "rules.md", max_chars=40)
    assert [c.text for c in chunks] == [
        "Open 9 to 5.\nClosed on bank holidays.",
        "Always lock your screen when you leave your desk, even for a minute, because client files are confidential.",
    ]
    assert chunk_document("", "rules.md") == []
