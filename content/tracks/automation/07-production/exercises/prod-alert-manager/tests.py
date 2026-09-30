from plp import hidden, raises, test
from solution import AlertManager, Event, Rule


def example():
    return AlertManager([
        Rule("error rate", "error_rate", ">", 0.05),
        Rule("quality drift", "eval_pass_rate", "<", 0.90, for_checks=2),
    ])


@test("Runs the example: drift needs two nights, errors resolve once")
def _():
    manager = example()
    assert manager.check({"error_rate": 0.01, "eval_pass_rate": 0.88}) == []
    assert manager.check({"error_rate": 0.12, "eval_pass_rate": 0.86}) == [
        Event("error rate", "firing", 0.12),
        Event("quality drift", "firing", 0.86),
    ]
    assert manager.check({"error_rate": 0.02, "eval_pass_rate": 0.85}) == [Event("error rate", "resolved", 0.02)]
    assert manager.firing == ["quality drift"]


@test("A sustained breach fires once, not on every check")
def _():
    manager = AlertManager([Rule("slow", "p95_ms", ">", 8000)])
    events = [manager.check({"p95_ms": value}) for value in (9800, 12000, 9100, 8500)]
    assert events == [[Event("slow", "firing", 9800)], [], [], []]
    assert manager.firing == ["slow"]


@test("A good check in between resets the count")
def _():
    manager = AlertManager([Rule("quality drift", "eval_pass_rate", "<", 0.90, for_checks=3)])
    for value in (0.85, 0.86, 0.95, 0.84, 0.83):
        assert manager.check({"eval_pass_rate": value}) == []
    assert manager.check({"eval_pass_rate": 0.82}) == [Event("quality drift", "firing", 0.82)]


@test("Unknown operators and zero for_checks are rejected")
def _():
    raises(ValueError, AlertManager, [Rule("cost", "cost_usd", ">=", 100)])
    raises(ValueError, AlertManager, [Rule("cost", "cost_usd", ">", 100, for_checks=0)])


@hidden("A missing metric leaves the rule as it was")
def _():
    manager = AlertManager([Rule("dead letters", "dead_letters", ">", 0, for_checks=2)])
    assert manager.check({"dead_letters": 3}) == []
    assert manager.check({"queue_depth": 40}) == []
    assert manager.check({"dead_letters": 4}) == [Event("dead letters", "firing", 4)]
    assert manager.check({}) == []
    assert manager.firing == ["dead letters"]
    assert manager.check({"dead_letters": 0}) == [Event("dead letters", "resolved", 0)]
    assert manager.firing == []


@hidden("It can fire again after resolving, and exactly the threshold doesn't breach")
def _():
    manager = AlertManager([Rule("cost", "cost_usd", ">", 100)])
    assert manager.check({"cost_usd": 100}) == []
    assert manager.check({"cost_usd": 150}) == [Event("cost", "firing", 150)]
    assert manager.check({"cost_usd": 90}) == [Event("cost", "resolved", 90)]
    assert manager.check({"cost_usd": 180}) == [Event("cost", "firing", 180)]
