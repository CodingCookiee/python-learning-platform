from dataclasses import dataclass, field


@dataclass
class Report:
    recall_before: float
    recall_after: float
    mrr_before: float
    mrr_after: float
    regressed: list[str] = field(default_factory=list)
    fixed: list[str] = field(default_factory=list)
    critical_failures: list[str] = field(default_factory=list)
    ok: bool = True


def compare_runs(baseline, current, tolerance=0.02, critical=()):
    """Compare two eval runs (question id -> rank of first relevant chunk, or None)."""
    def hit_rate(run):
        return round(sum(rank is not None for rank in run.values()) / len(run), 3)

    before, after = hit_rate(baseline), hit_rate(current)
    return Report(before, after, 0.0, 0.0, ok=after >= before)
