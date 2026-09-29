from plp import hidden, raises, test
from solution import chunk_fixed

SENTENCE = "Invoice numbers are sequential and never repeat."
ARTICLE = (
    "Late payment reminders are sent automatically. The first goes 3 days after the due date, "
    "the second 10 days after. You can turn reminders off for a single client in their settings. "
    "Reminders are never sent for invoices marked as paid, or for drafts."
)


@test("Splits the example into three overlapping windows")
def _():
    assert chunk_fixed(SENTENCE, size=20, overlap=6) == [
        "Invoice numbers are ",
        "s are sequential and",
        "al and never repeat.",
    ]


@test("Consecutive chunks share exactly `overlap` characters")
def _():
    chunks = chunk_fixed(ARTICLE, size=60, overlap=15)
    for before, after in zip(chunks, chunks[1:]):
        assert before[-15:] == after[:15], f"{before!r} and {after!r} don't overlap by 15"


@test("Nothing is lost: the chunks rebuild the text, and none is too long")
def _():
    for size, overlap in [(60, 15), (37, 0), (100, 99)]:
        chunks = chunk_fixed(ARTICLE, size=size, overlap=overlap)
        rebuilt = chunks[0] + "".join(chunk[overlap:] for chunk in chunks[1:])
        assert rebuilt == ARTICLE, f"size={size}, overlap={overlap}"
        assert max(len(chunk) for chunk in chunks) <= size


@test("Stops at the end: no extra window that only repeats the end")
def _():
    assert chunk_fixed("a" * 20, size=10, overlap=0) == ["a" * 10, "a" * 10]
    assert chunk_fixed("abcdefghijklmnop", size=10, overlap=4) == ["abcdefghij", "ghijklmnop"]


@test("Rejects an overlap that isn't smaller than the size")
def _():
    raises(ValueError, chunk_fixed, SENTENCE, 20, 20)
    raises(ValueError, chunk_fixed, SENTENCE, 20, 25)


@hidden("Empty and short texts, and other bad arguments")
def _():
    assert chunk_fixed("", size=20, overlap=5) == []
    assert chunk_fixed("Paid.", size=20, overlap=5) == ["Paid."]
    assert chunk_fixed("x" * 20, size=20, overlap=5) == ["x" * 20]
    raises(ValueError, chunk_fixed, SENTENCE, 0, 0)
    raises(ValueError, chunk_fixed, SENTENCE, 20, -1)
