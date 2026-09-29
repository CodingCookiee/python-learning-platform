from plp import hidden, raises, test
from solution import Report, compare_runs

BASELINE = {"q01": 1, "q02": 2, "q03": None, "q05": 1, "q06": 3}
CURRENT = {"q01": 1, "q02": None, "q03": 2, "q05": 1, "q06": 1}


@test("Fails the change that broke a critical question")
def _():
    assert compare_runs(BASELINE, CURRENT, critical={"q02"}) == Report(
        recall_before=0.8, recall_after=0.8, mrr_before=0.567, mrr_after=0.7,
        regressed=["q02"], fixed=["q03"], critical_failures=["q02"], ok=False,
    )


@test("Passes the same change when no critical question broke")
def _():
    report = compare_runs(BASELINE, CURRENT)
    assert (report.regressed, report.fixed, report.critical_failures, report.ok) == (["q02"], ["q03"], [], True)


@test("A drop larger than the tolerance fails; a small one passes")
def _():
    baseline = {f"q{n:02}": 1 for n in range(1, 51)}
    one_miss = dict(baseline, q07=None)
    assert compare_runs(baseline, one_miss).ok is True
    assert compare_runs(baseline, dict(one_miss, q08=None)).ok is False
    assert compare_runs(baseline, dict(one_miss, q08=None), tolerance=0.05).ok is True


@test("MRR can fail the gate even when every question is still found")
def _():
    baseline = {"q01": 1, "q02": 1, "q03": 1, "q04": 2}
    worse = {"q01": 3, "q02": 1, "q03": 2, "q04": 2}
    report = compare_runs(baseline, worse)
    assert (report.recall_before, report.recall_after) == (1.0, 1.0)
    assert (report.mrr_before, report.mrr_after, report.ok) == (0.875, 0.583, False)


@test("A critical question ranked lower is a failure, even if it's still found")
def _():
    report = compare_runs({"q01": 1, "q02": 1}, {"q01": 2, "q02": 1}, tolerance=0.5, critical=["q01", "q02"])
    assert (report.critical_failures, report.ok) == (["q01"], False)


@hidden("Runs over different questions are refused, naming the ids")
def _():
    raises(ValueError, compare_runs, BASELINE, {k: v for k, v in CURRENT.items() if k != "q06"}, match="q06")
    raises(ValueError, compare_runs, BASELINE, dict(CURRENT, q09=1), match="q09")


@hidden("A critical question that was already missed, or is unknown, isn't a critical failure")
def _():
    report = compare_runs(BASELINE, CURRENT, critical={"q03", "q99"})
    assert (report.critical_failures, report.ok) == ([], True)
