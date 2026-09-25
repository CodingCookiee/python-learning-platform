from plp import test, hidden
from solution import tag_cloud


def sample():
    return [
        ("Intro to sets", ["Python", "beginner"]),
        ("Merging dicts", ["python", " dicts ", ""]),
        ("Loop patterns", ["Beginner", "loops"]),
    ]


@test("Collects every distinct tag, normalised and sorted")
def _():
    assert tag_cloud(sample()) == ["beginner", "dicts", "loops", "python"]


@test("Leaves out tags that are only spaces")
def _():
    assert tag_cloud([("Draft", ["   ", "", "wip"])]) == ["wip"]


@test("Returns an empty list when there are no posts")
def _():
    assert tag_cloud([]) == []


@hidden("Handles posts with no tags")
def _():
    assert tag_cloud([("Untitled", []), ("Notes", ["Misc"])]) == ["misc"]


@hidden("Leaves the posts unchanged")
def _():
    posts = sample()
    tag_cloud(posts)
    assert posts == sample()
