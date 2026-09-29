from datetime import UTC, datetime, timedelta

from plp import hidden, test
from solution import select_batch

NINE = datetime(2026, 3, 9, 9, 0, tzinfo=UTC)


def lead(id, minutes_after_nine):
    return {"id": id, "created": NINE + timedelta(minutes=minutes_after_nine)}


LEADS = [lead("L-101", -5), lead("L-103", 40), lead("L-102", 20), lead("L-104", 75)]


def ids(batch):
    return [item["id"] for item in batch]


@test("Takes the leads after the watermark, up to now, oldest first")
def _():
    batch, mark = select_batch(LEADS, watermark=NINE, now=NINE + timedelta(hours=1))
    assert ids(batch) == ["L-102", "L-103"]
    assert mark == NINE + timedelta(minutes=40)


@test("A missed run loses nothing: the next run catches up")
def _():
    # Every run from 09:15 to 10:15 was missed; the 10:30 run still gets all three leads
    batch, _ = select_batch(LEADS, watermark=NINE, now=NINE + timedelta(hours=1, minutes=30))
    assert ids(batch) == ["L-102", "L-103", "L-104"]


@test("Running twice in a row processes nothing the second time")
def _():
    now = NINE + timedelta(hours=1)
    _, mark = select_batch(LEADS, watermark=NINE, now=now)
    again, same_mark = select_batch(LEADS, watermark=mark, now=now)
    assert again == []
    assert same_mark == mark


@test("The first run, with no watermark, takes everything up to now")
def _():
    batch, mark = select_batch(LEADS, watermark=None, now=NINE + timedelta(hours=1))
    assert ids(batch) == ["L-101", "L-102", "L-103"]
    assert mark == NINE + timedelta(minutes=40)


@hidden("A capped batch takes the oldest and leaves the rest for next time")
def _():
    backlog = [lead(f"L-{200 + n}", n) for n in range(1, 8)]
    now = NINE + timedelta(hours=1)
    first, mark = select_batch(backlog, watermark=NINE, now=now, limit=3)
    second, _ = select_batch(backlog, watermark=mark, now=now, limit=3)
    assert ids(first) == ["L-201", "L-202", "L-203"]
    assert ids(second) == ["L-204", "L-205", "L-206"]


@hidden("An empty batch keeps the old watermark, including None")
def _():
    assert select_batch([], watermark=NINE, now=NINE + timedelta(hours=1)) == ([], NINE)
    assert select_batch([], watermark=None, now=NINE) == ([], None)


@hidden("A lead created exactly at now is included; one after it waits")
def _():
    now = NINE + timedelta(minutes=40)
    batch, _ = select_batch(LEADS, watermark=NINE, now=now)
    assert ids(batch) == ["L-102", "L-103"]
