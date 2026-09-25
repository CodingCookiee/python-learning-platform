from plp import test, hidden
from solution import delivery_report


@test("Summarises a week of deliveries")
def _():
    assert delivery_report([20, 22, 24, 23, 21, 96]) == {
        "deliveries": 6, "mean": 34.3, "median": 22.5, "stdev": 30.2, "late": 1,
    }


@test("Uses the late_after you pass")
def _():
    assert delivery_report([20, 22, 24, 23, 21, 96], late_after=22)["late"] == 3


@test("A delivery exactly on the limit isn't late")
def _():
    assert delivery_report([48, 12])["late"] == 0


@hidden("Rounds every figure to one decimal place")
def _():
    report = delivery_report([10, 11, 13])
    assert report["mean"] == 11.3
    assert report["median"] == 11
    assert report["stdev"] == 1.5


@hidden("Raises ValueError for fewer than two deliveries")
def _():
    for hours in ([30], []):
        try:
            delivery_report(hours)
        except ValueError:
            continue
        raise AssertionError(f"delivery_report({hours}) should raise ValueError")
