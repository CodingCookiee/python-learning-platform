from plp import hidden, raises, test
from solution import chunk

PHOTOS = ["a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg", "f.jpg", "g.jpg"]


@test("Splits seven photos three ways")
def _():
    assert chunk(PHOTOS, 3) == [["a.jpg", "b.jpg", "c.jpg"], ["d.jpg", "e.jpg"], ["f.jpg", "g.jpg"]]


@test("An even split")
def _():
    assert chunk(list(range(8)), 4) == [[0, 1], [2, 3], [4, 5], [6, 7]]


@test("Fewer items than parts: one item per chunk, no empty chunks")
def _():
    assert chunk(["a.jpg", "b.jpg"], 8) == [["a.jpg"], ["b.jpg"]]
    assert chunk([], 4) == []


@test("parts below 1 is refused")
def _():
    raises(ValueError, chunk, PHOTOS, 0)


@hidden("Any size: the chunks rebuild the list and differ by at most one")
def _():
    for count in range(0, 40):
        for parts in range(1, 10):
            items = list(range(count))
            chunks = chunk(items, parts)
            sizes = [len(c) for c in chunks]
            assert [item for c in chunks for item in c] == items, f"chunk(range({count}), {parts}) lost or reordered items"
            assert sizes == sorted(sizes, reverse=True) and (not sizes or max(sizes) - min(sizes) <= 1), (
                f"chunk(range({count}), {parts}) made chunks of sizes {sizes}"
            )
            assert len(chunks) == min(count, parts)


@hidden("One part is the whole list")
def _():
    assert chunk(PHOTOS, 1) == [PHOTOS]
