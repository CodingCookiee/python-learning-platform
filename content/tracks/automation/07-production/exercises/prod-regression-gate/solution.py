from dataclasses import dataclass


@dataclass
class GateResult:
    ok: bool
    pass_rate: float
    baseline_rate: float
    newly_failing: list[str]
    fixed: list[str]
    reasons: list[str]


def rate(results: dict[str, bool]) -> float:
    return sum(results.values()) / len(results) if results else 0.0


def gate(baseline: dict[str, bool], candidate: dict[str, bool], *, min_pass_rate=0.90, max_drop=0.02) -> GateResult:
    """Whether the candidate run may ship, compared with the baseline."""
    new_rate, old_rate = rate(candidate), rate(baseline)
    newly_failing = [case for case, ok in candidate.items() if baseline.get(case) is True and not ok]
    fixed = [case for case, ok in candidate.items() if baseline.get(case) is False and ok]

    reasons = []
    if new_rate < min_pass_rate:
        reasons.append(f"pass rate {new_rate:.1%} is below the floor of {min_pass_rate:.1%}")
    drop = old_rate - new_rate
    if drop > max_drop + 1e-9:  # floats: 0.90 - 0.88 is a hair over 0.02
        reasons.append(f"pass rate dropped {drop * 100:.1f} points from {old_rate:.1%}")
    return GateResult(not reasons, new_rate, old_rate, newly_failing, fixed, reasons)
