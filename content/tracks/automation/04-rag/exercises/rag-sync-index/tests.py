import hashlib

from plp import hidden, test
from plp_fakes import fake_embed
from solution import Index, sync_index

LEAVE_OLD = "Annual leave: 20 days.\n\nCarry over up to 5 days.\n\nBook leave in the HR portal."
LEAVE_NEW = "Annual leave: 25 days.\n\nBook leave in the HR portal."
EXPENSES = "Submit receipts within 30 days."


class Recorder:
    def __init__(self):
        self.calls = []

    def __call__(self, texts):
        self.calls.append(list(texts))
        return fake_embed(texts)


def sha(text):
    return hashlib.sha256(text.encode()).hexdigest()


@test("Adds new documents, then updates one and removes another")
def _():
    index, hashes = Index(fake_embed), {}
    assert sync_index(index, {"leave.md": "Annual leave: 20 days.", "expenses.md": "Receipts within 30 days."}, hashes) == {
        "added": ["expenses.md", "leave.md"], "updated": [], "removed": [], "unchanged": [],
    }
    assert sync_index(index, {"leave.md": "Annual leave: 25 days."}, hashes) == {
        "added": [], "updated": ["leave.md"], "removed": ["expenses.md"], "unchanged": [],
    }
    assert [c["text"] for c in index.chunks.values()] == ["Annual leave: 25 days."]


@test("An unchanged run embeds nothing")
def _():
    embed = Recorder()
    index, hashes = Index(embed), {}
    sync_index(index, {"leave.md": LEAVE_OLD, "expenses.md": EXPENSES}, hashes)
    report = sync_index(index, {"leave.md": LEAVE_OLD, "expenses.md": EXPENSES}, hashes)
    assert report == {"added": [], "updated": [], "removed": [], "unchanged": ["expenses.md", "leave.md"]}
    assert len(embed.calls) == 1


@test("A shorter document leaves no old chunks behind")
def _():
    index, hashes = Index(fake_embed), {}
    sync_index(index, {"leave.md": LEAVE_OLD}, hashes)
    sync_index(index, {"leave.md": LEAVE_NEW}, hashes)
    assert sorted(index.chunks) == ["leave.md#0", "leave.md#1"]
    assert index.chunks["leave.md#1"]["text"] == "Book leave in the HR portal."
    assert sorted(index.vectors) == ["leave.md#0", "leave.md#1"]


@test("Embeds only the changed documents' chunks, in one call")
def _():
    embed = Recorder()
    index, hashes = Index(embed), {}
    sync_index(index, {"leave.md": LEAVE_OLD, "expenses.md": EXPENSES}, hashes)
    sync_index(index, {"leave.md": LEAVE_NEW, "expenses.md": EXPENSES, "books.md": "R&D books are claimable."}, hashes)
    assert embed.calls[1] == ["R&D books are claimable.", "Annual leave: 25 days.", "Book leave in the HR portal."]
    assert len(embed.calls) == 2


@test("Keeps the saved hashes up to date")
def _():
    hashes = {}
    index = Index(fake_embed)
    sync_index(index, {"leave.md": LEAVE_OLD, "expenses.md": EXPENSES}, hashes)
    sync_index(index, {"leave.md": LEAVE_NEW}, hashes)
    assert hashes == {"leave.md": sha(LEAVE_NEW)}


@hidden("Works from saved state: a restarted job only re-indexes what changed")
def _():
    embed = Recorder()
    index = Index(embed)
    hashes = {"leave.md": sha(LEAVE_OLD), "expenses.md": sha(EXPENSES)}
    report = sync_index(index, {"leave.md": LEAVE_OLD, "expenses.md": "Submit receipts within 14 days."}, hashes)
    assert report == {"added": [], "updated": ["expenses.md"], "removed": [], "unchanged": ["leave.md"]}
    assert embed.calls == [["Submit receipts within 14 days."]]
    assert sync_index(Index(embed), {}, {}) == {"added": [], "updated": [], "removed": [], "unchanged": []}
