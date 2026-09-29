from plp import hidden, raises, test
from solution import Calibration, calibrate

HUMAN = {"c1": True, "c2": False, "c3": True, "c4": False, "c5": True}
JUDGE = {"c1": True, "c2": True, "c3": True, "c4": False, "c5": False}


@test("Calibrates the example")
def _():
    assert calibrate(HUMAN, JUDGE) == Calibration(agreement=0.6, false_passes=["c2"], false_fails=["c5"], false_pass_rate=0.5)


@test("Perfect agreement has no disagreements")
def _():
    assert calibrate(HUMAN, dict(HUMAN)) == Calibration(1.0, [], [], 0.0)


@test("A lenient judge that passes everything lets every bad answer through")
def _():
    result = calibrate(HUMAN, {i: True for i in HUMAN})
    assert result.false_passes == ["c2", "c4"]
    assert result.false_fails == []
    assert result.false_pass_rate == 1.0
    assert result.agreement == 0.6


@test("Different ids raise ValueError naming what's missing")
def _():
    raises(ValueError, calibrate, HUMAN, {i: v for i, v in JUDGE.items() if i != "c4"}, match="c4")
    raises(ValueError, calibrate, HUMAN, {**JUDGE, "c9": True}, match="c9")


@hidden("Keeps the order of the human labels, and handles no human failures")
def _():
    human = {"t-30": True, "t-10": True, "t-20": True}
    judge = {"t-10": False, "t-20": True, "t-30": False}
    result = calibrate(human, judge)
    assert result.false_fails == ["t-30", "t-10"]
    assert result.false_pass_rate == 0.0
    assert abs(result.agreement - 1 / 3) < 1e-9


@hidden("The false-pass rate is over the answers the person failed")
def _():
    human = {f"c{n}": n >= 4 for n in range(10)}          # c0-c3 failed by the person
    judge = {f"c{n}": n != 5 for n in range(10)}          # passes c0-c3, fails c5
    result = calibrate(human, judge)
    assert result.false_pass_rate == 1.0
    assert result.false_passes == ["c0", "c1", "c2", "c3"]
    assert result.agreement == 0.5
