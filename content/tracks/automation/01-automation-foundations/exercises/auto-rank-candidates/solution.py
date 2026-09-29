def payback(candidate, hourly_rate):
    """Months to pay back (1 decimal), or None if the automation never pays for itself."""
    runs = candidate["runs_per_month"]
    time_value = runs * candidate["minutes_per_run"] / 60 * hourly_rate
    error_value = runs * candidate.get("error_rate", 0) * candidate.get("cost_per_error", 0)
    net = time_value + error_value - candidate.get("running_cost", 0)
    if net <= 0:
        return None
    return round(candidate["build_cost"] / net, 1)


def rank_candidates(candidates, *, hourly_rate, max_payback=12):
    """(name, payback_months) for stable candidates paying back within max_payback, fastest first."""
    ranked = []
    for candidate in candidates:
        if not candidate.get("stable", True):
            continue
        months = payback(candidate, hourly_rate)
        if months is not None and months <= max_payback:
            ranked.append((candidate["name"], months))
    return sorted(ranked, key=lambda pair: (pair[1], pair[0]))
