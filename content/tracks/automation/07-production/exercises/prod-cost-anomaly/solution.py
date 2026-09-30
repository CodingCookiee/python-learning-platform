from dataclasses import dataclass
from decimal import Decimal
from statistics import median


@dataclass(frozen=True)
class Anomaly:
    day: str
    cost: Decimal
    baseline: Decimal


def cost_anomalies(daily, *, window=7, factor=Decimal("2"), min_history=3):
    """Days whose cost is more than factor times the median of the days before them."""
    anomalies = []
    for index, (day, cost) in enumerate(daily):
        history = [previous for _day, previous in daily[max(0, index - window) : index]]
        if len(history) < min_history:
            continue
        baseline = median(history)
        if cost > factor * baseline:
            anomalies.append(Anomaly(day, cost, baseline))
    return anomalies
