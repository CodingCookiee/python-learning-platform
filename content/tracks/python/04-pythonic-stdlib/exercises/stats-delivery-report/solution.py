import statistics


def delivery_report(hours, late_after=48):
    """Count, mean, median, stdev and late count for a list of delivery times."""
    return {
        "deliveries": len(hours),
        "mean": round(statistics.mean(hours), 1),
        "median": round(statistics.median(hours), 1),
        "stdev": round(statistics.stdev(hours), 1),
        "late": sum(1 for h in hours if h > late_after),
    }
