from dataclasses import dataclass, field


@dataclass(frozen=True)
class Score:
    passed: bool
    reason: str


@dataclass
class CaseResult:
    id: str
    passed: bool
    reason: str
    output: str | None
    tags: list[str] = field(default_factory=list)


@dataclass
class EvalReport:
    results: list[CaseResult]

    @property
    def pass_rate(self):
        """The share of cases that passed, 0.0 when there are none."""
        ...

    @property
    def by_tag(self):
        """{tag: pass rate} over the cases with that tag."""
        ...

    @property
    def failures(self):
        """The failing results, in order."""
        ...


def run_eval(system, cases, scorers):
    """Run and score every case. Exceptions fail one case; unknown scorers raise ValueError."""
    results = []
    for case in cases:
        output = system(case["input"])
        score = scorers[case["scorer"]](output, case["expected"])
        results.append(CaseResult(case["id"], score.passed, score.reason, output, case.get("tags", [])))
    return EvalReport(results)
