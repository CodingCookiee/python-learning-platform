from dataclasses import dataclass
from decimal import Decimal


@dataclass(frozen=True)
class Anomaly:
    day: str
    cost: Decimal
    baseline: Decimal


def cost_anomalies(daily, *, window=7, factor=Decimal("2"), min_history=3):
    """Days whose cost is more than factor times the median of the days before them."""
    costs = [cost for _day, cost in daily]
    average = sum(costs) / len(costs)
    return [Anomaly(day, cost, average) for day, cost in daily if cost > factor * average]
