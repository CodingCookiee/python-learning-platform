from plp import test, hidden
from solution import longest_outage

CHECKS = [
    ("14:00", "up"), ("14:01", "down"), ("14:02", "down"), ("14:03", "up"),
    ("14:04", "down"), ("14:05", "down"), ("14:06", "down"), ("14:07", "up"),
]


@test("Finds the longest run of down checks")
def _():
    assert longest_outage(CHECKS) == ("14:04", "14:06", 3)


@test("Returns None when the site was never down")
def _():
    assert longest_outage([("09:00", "up"), ("09:01", "up")]) is None


@test("A single down check is a one-minute outage")
def _():
    assert longest_outage([("09:00", "up"), ("09:01", "down"), ("09:02", "up")]) == ("09:01", "09:01", 1)


@hidden("Keeps the earlier outage when two are equally long")
def _():
    checks = [("10:00", "down"), ("10:01", "down"), ("10:02", "up"), ("10:03", "down"), ("10:04", "down")]
    assert longest_outage(checks) == ("10:00", "10:01", 2)


@hidden("Handles a site that was down the whole time, and no checks at all")
def _():
    assert longest_outage([("11:00", "down"), ("11:01", "down")]) == ("11:00", "11:01", 2)
    assert longest_outage([]) is None


@hidden("An outage at the very end counts")
def _():
    checks = [("12:00", "down"), ("12:01", "up"), ("12:02", "down"), ("12:03", "down")]
    assert longest_outage(checks) == ("12:02", "12:03", 2)
