from plp import hidden, test
from solution import gate

BASELINE = {"t-01": True, "t-02": True, "t-03": False, "t-04": True, "t-05": True}
CANDIDATE = {"t-01": False, "t-02": True, "t-03": True, "t-04": True, "t-05": True}


def run(passing, total, prefix="t"):
    """A run of `total` cases where the first `passing` pass."""
    return {f"{prefix}-{n:03d}": n < passing for n in range(total)}


@test("Gates the example: one broke, one fixed, below the floor")
def _():
    result = gate(BASELINE, CANDIDATE)
    assert (result.ok, result.pass_rate, result.newly_failing, result.fixed) == (False, 0.8, ["t-01"], ["t-03"])
    assert result.reasons == ["pass rate 80.0% is below the floor of 90.0%"]


@test("A drop of more than max_drop fails, even above the floor")
def _():
    result = gate(run(48, 50), run(46, 50))
    assert result.ok is False
    assert result.reasons == ["pass rate dropped 4.0 points from 96.0%"]
    assert result.newly_failing == ["t-046", "t-047"]


@test("A good run passes, and still lists what broke")
def _():
    baseline = run(47, 50)
    candidate = {**run(48, 50), "t-010": False}
    result = gate(baseline, candidate)
    assert result.ok is True
    assert result.reasons == []
    assert result.newly_failing == ["t-010"]
    assert result.fixed == ["t-047"]
    assert result.baseline_rate == 0.94


@test("Both reasons can apply at once")
def _():
    result = gate(run(46, 50), run(40, 50))
    assert result.reasons == ["pass rate 80.0% is below the floor of 90.0%", "pass rate dropped 12.0 points from 92.0%"]


@hidden("A drop of exactly max_drop is allowed, despite float rounding")
def _():
    result = gate(run(45, 50), run(44, 50))
    assert not any("dropped" in reason for reason in result.reasons)
    assert gate(run(45, 50), run(44, 50), min_pass_rate=0.85).ok is True


@hidden("New cases count towards the pass rate but aren't newly failing")
def _():
    candidate = {**run(50, 50), "t-new-1": False, "t-new-2": True}
    result = gate(run(50, 50), candidate, max_drop=0.05)
    assert result.newly_failing == []
    assert abs(result.pass_rate - 51 / 52) < 1e-9
    assert result.ok is True
