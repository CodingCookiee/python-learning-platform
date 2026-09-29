from collections import defaultdict
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
    def pass_rate(self) -> float:
        """The share of cases that passed, 0.0 when there are none."""
        if not self.results:
            return 0.0
        return sum(result.passed for result in self.results) / len(self.results)

    @property
    def by_tag(self) -> dict[str, float]:
        """{tag: pass rate} over the cases with that tag."""
        flags: dict[str, list[bool]] = defaultdict(list)
        for result in self.results:
            for tag in result.tags:
                flags[tag].append(result.passed)
        return {tag: sum(values) / len(values) for tag, values in flags.items()}

    @property
    def failures(self) -> list[CaseResult]:
        """The failing results, in order."""
        return [result for result in self.results if not result.passed]


def run_eval(system, cases, scorers) -> EvalReport:
    """Run and score every case. Exceptions fail one case; unknown scorers raise ValueError."""
    for case in cases:
        if case["scorer"] not in scorers:
            raise ValueError(f"Case {case['id']!r} uses unknown scorer {case['scorer']!r}")

    results = []
    for case in cases:
        tags = list(case.get("tags", []))
        try:
            output = system(case["input"])
        except Exception as exc:
            results.append(CaseResult(case["id"], False, f"error: {type(exc).__name__}: {exc}", None, tags))
            continue
        score = scorers[case["scorer"]](output, case["expected"])
        results.append(CaseResult(case["id"], score.passed, score.reason, output, tags))
    return EvalReport(results)
