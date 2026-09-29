from plp import hidden, raises, test
from solution import CaseResult, EvalReport, Score, run_eval


def contains(output, expected):
    missing = [phrase for phrase in expected if phrase.casefold() not in output.casefold()]
    return Score(not missing, "ok" if not missing else f"missing {missing}")


def exact(output, expected):
    return Score(output.strip().casefold() == expected.casefold(), "ok")


def support_bot(question):
    if "Ireland" in question:
        raise TimeoutError("model took too long")
    return "Refunds reach your card within 14 days."


CASES = [
    {"id": "refund-window", "input": "How long do refunds take?", "expected": ["14 days"], "scorer": "contains", "tags": ["refunds"]},
    {"id": "ship-ireland", "input": "Do you ship to Ireland?", "expected": ["Ireland"], "scorer": "contains", "tags": ["shipping"]},
]


@test("Scores the example: one pass, one timeout")
def _():
    report = run_eval(support_bot, CASES, {"contains": contains})
    assert report.pass_rate == 0.5
    assert report.by_tag == {"refunds": 1.0, "shipping": 0.0}
    assert report.failures[0].reason == "error: TimeoutError: model took too long"


@test("Records every case in order, with outputs and reasons")
def _():
    report = run_eval(support_bot, CASES, {"contains": contains})
    assert [r.id for r in report.results] == ["refund-window", "ship-ireland"]
    assert report.results[0] == CaseResult("refund-window", True, "ok", "Refunds reach your card within 14 days.", ["refunds"])
    assert report.results[1].output is None


@test("Uses the scorer each case names")
def _():
    cases = [
        {"id": "label-billing", "input": "I was charged twice", "expected": "billing", "scorer": "exact", "tags": ["labels"]},
        {"id": "label-refund", "input": "Refund please", "expected": ["refund"], "scorer": "contains", "tags": ["labels", "refunds"]},
    ]
    report = run_eval(lambda text: "Billing" if "charged" in text else "Refund requested", cases, {"exact": exact, "contains": contains})
    assert [r.passed for r in report.results] == [True, True]
    assert report.by_tag == {"labels": 1.0, "refunds": 1.0}


@test("An unknown scorer raises ValueError before the system runs")
def _():
    calls = []
    cases = CASES + [{"id": "tone-check", "input": "Hi", "expected": "friendly", "scorer": "judge"}]
    raises(ValueError, run_eval, lambda text: calls.append(text) or "ok", cases, {"contains": contains}, match="tone-check")
    assert calls == []


@hidden("Keeps going after several failures, and tags are optional")
def _():
    def flaky(question):
        if question.startswith("boom"):
            raise RuntimeError("upstream 502")
        return question

    cases = [
        {"id": f"case-{n}", "input": text, "expected": ["ok"], "scorer": "contains"}
        for n, text in enumerate(["boom 1", "ok 2", "boom 3", "fine 4"])
    ]
    report = run_eval(flaky, cases, {"contains": contains})
    assert [r.passed for r in report.results] == [False, True, False, False]
    assert report.pass_rate == 0.25
    assert report.by_tag == {}
    assert [r.id for r in report.failures] == ["case-0", "case-2", "case-3"]
    assert report.failures[1].reason == "error: RuntimeError: upstream 502"


@hidden("An empty report has a pass rate of 0.0")
def _():
    assert EvalReport([]).pass_rate == 0.0
    assert run_eval(support_bot, [], {}).failures == []
