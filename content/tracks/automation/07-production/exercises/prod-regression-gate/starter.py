from dataclasses import dataclass


@dataclass
class GateResult:
    ok: bool
    pass_rate: float
    baseline_rate: float
    newly_failing: list[str]
    fixed: list[str]
    reasons: list[str]


def gate(baseline, candidate, *, min_pass_rate=0.90, max_drop=0.02):
    """Whether the candidate run may ship, compared with the baseline."""
    rate = sum(candidate.values()) / len(candidate)
    old = sum(baseline.values()) / len(baseline)
    reasons = []
    if rate < min_pass_rate:
        reasons.append(f"pass rate {rate:.1%} is below the floor of {min_pass_rate:.1%}")
    return GateResult(not reasons, rate, old, [], [], reasons)
