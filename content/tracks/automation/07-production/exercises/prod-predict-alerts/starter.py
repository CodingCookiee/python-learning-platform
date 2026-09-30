BASELINE_COST = 0.42  # dollars per 5-minute window, last week's median

windows = [
    {"window": "14:00", "requests": 400, "errors": 6, "p95_ms": 2100, "cost": 0.42},
    {"window": "14:05", "requests": 380, "errors": 41, "p95_ms": 9800, "cost": 0.40},
    {"window": "14:10", "requests": 12, "errors": 3, "p95_ms": 3000, "cost": 0.02},
    {"window": "14:15", "requests": 410, "errors": 9, "p95_ms": 2300, "cost": 1.95},
]


def alerts(metrics, *, min_requests=50):
    fired = []
    if metrics["requests"] >= min_requests and metrics["errors"] / metrics["requests"] > 0.05:
        fired.append("error rate")
    if metrics["p95_ms"] > 8000:
        fired.append("slow")
    if metrics["cost"] > 3 * BASELINE_COST:
        fired.append("cost")
    return fired


for metrics in windows:
    print(metrics["window"], alerts(metrics) or "quiet")
