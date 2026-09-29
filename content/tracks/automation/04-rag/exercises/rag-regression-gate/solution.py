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


def _hit_rate(run):
    return round(sum(rank is not None for rank in run.values()) / len(run), 3)


def _mrr(run):
    return round(sum(1 / rank for rank in run.values() if rank is not None) / len(run), 3)


def compare_runs(baseline, current, tolerance=0.02, critical=()):
    """Compare two eval runs (question id -> rank of first relevant chunk, or None)."""
    if set(baseline) != set(current):
        raise ValueError(f"the runs cover different questions: {sorted(set(baseline) ^ set(current))}")
    if not baseline:
        raise ValueError("no questions to compare")
    regressed = sorted(q for q in baseline if baseline[q] is not None and current[q] is None)
    fixed = sorted(q for q in baseline if baseline[q] is None and current[q] is not None)
    critical_failures = sorted(
        q for q in critical
        if q in baseline and baseline[q] is not None and (current[q] is None or current[q] > baseline[q])
    )
    report = Report(_hit_rate(baseline), _hit_rate(current), _mrr(baseline), _mrr(current), regressed, fixed, critical_failures)
    report.ok = (
        report.recall_after >= round(report.recall_before - tolerance, 3)
        and report.mrr_after >= round(report.mrr_before - tolerance, 3)
        and not critical_failures
    )
    return report
