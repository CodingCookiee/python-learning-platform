from itertools import accumulate


def running_totals(daily_sales):
    """Running totals of daily_sales, e.g. [120, 80, 200] -> [120, 200, 400]."""
    return list(accumulate(daily_sales))
