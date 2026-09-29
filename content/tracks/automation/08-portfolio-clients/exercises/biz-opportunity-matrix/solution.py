from decimal import Decimal

WEIGHTS = {"low": 1, "medium": 2, "high": 3}


def priority(op, hourly_rate):
    """Monthly value (time plus errors avoided), weighted by how much the client cares."""
    runs = Decimal(op["runs_per_month"])
    time_value = runs * op["minutes_per_run"] / 60 * hourly_rate
    error_value = runs * op.get("error_rate", 0) * op.get("cost_per_error", 0)
    return (time_value + error_value) * WEIGHTS[op.get("strategic", "medium")]


def plan_backlog(opportunities, *, hourly_rate, value_bar, effort_bar):
    """Names in each quadrant of the value/effort matrix, highest priority first."""
    boxes = {"quick wins": [], "big bets": [], "fill-ins": [], "money pits": []}
    for op in opportunities:
        score = priority(op, hourly_rate)
        high_value = score >= value_bar
        low_effort = op["build_days"] <= effort_bar
        if high_value:
            box = "quick wins" if low_effort else "big bets"
        else:
            box = "fill-ins" if low_effort else "money pits"
        boxes[box].append((score, op["name"]))
    return {box: [name for _, name in sorted(items, key=lambda pair: (-pair[0], pair[1]))]
            for box, items in boxes.items()}
