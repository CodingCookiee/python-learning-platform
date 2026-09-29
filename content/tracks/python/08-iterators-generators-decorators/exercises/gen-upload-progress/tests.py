from itertools import islice

from plp import test, hidden, source_uses
from solution import upload_all, upload_batch


class FakeCRM:
    """Records every upload; refuses the ids it's told to."""

    def __init__(self, refuse=()):
        self.refuse = set(refuse)
        self.uploaded = []

    def upload(self, record):
        self.uploaded.append(record["id"])
        return record["id"] not in self.refuse


def records(*ids):
    return [{"id": record_id, "name": f"Customer {record_id}"} for record_id in ids]


def returned_value(generator):
    """Run a generator to the end and return what it returned."""
    while True:
        try:
            next(generator)
        except StopIteration as stop:
            return stop.value


@test("Streams progress events and a summary")
def _():
    batches = [[{"id": "C1"}, {"id": "C2"}], [{"id": "C3"}]]
    assert list(upload_all(batches, lambda record: record["id"] != "C2")) == [
        ("batch", 1, 2),
        ("uploaded", "C1"),
        ("failed", "C2"),
        ("batch_done", 1, 1),
        ("batch", 2, 1),
        ("uploaded", "C3"),
        ("batch_done", 2, 1),
        ("summary", 2, 3),
    ]


@test("upload_batch yields an event per record and returns the count")
def _():
    crm = FakeCRM(refuse={"C2"})
    assert list(upload_batch(records("C1", "C2", "C3"), crm.upload)) == [
        ("uploaded", "C1"), ("failed", "C2"), ("uploaded", "C3"),
    ]
    assert returned_value(upload_batch(records("C1", "C2", "C3"), crm.upload)) == 2


@test("upload_all delegates with yield from")
def _():
    assert source_uses(node="YieldFrom"), "upload_all should hand over to upload_batch with yield from"


@test("Uploads a record only when its event is asked for")
def _():
    crm = FakeCRM()
    events = upload_all([records("C1", "C2"), records("C3")], crm.upload)
    assert crm.uploaded == [], "creating the generator shouldn't upload anything"
    assert list(islice(events, 2)) == [("batch", 1, 2), ("uploaded", "C1")]
    assert crm.uploaded == ["C1"]


@hidden("Every upload failing")
def _():
    crm = FakeCRM(refuse={"C1", "C2"})
    events = list(upload_all([records("C1"), records("C2")], crm.upload))
    assert events[-1] == ("summary", 0, 2)
    assert ("batch_done", 2, 0) in events


@hidden("Empty batches, and no batches at all")
def _():
    crm = FakeCRM()
    assert list(upload_all([[], records("C1")], crm.upload)) == [
        ("batch", 1, 0), ("batch_done", 1, 0), ("batch", 2, 1), ("uploaded", "C1"), ("batch_done", 2, 1), ("summary", 1, 1),
    ]
    assert list(upload_all([], crm.upload)) == [("summary", 0, 0)]
    assert returned_value(upload_batch([], crm.upload)) == 0
