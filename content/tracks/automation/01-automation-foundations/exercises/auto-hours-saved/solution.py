WEEKS_PER_MONTH = 52 / 12


def hours_saved(runs_per_week, minutes_per_run):
    """Hours a month of manual work, rounded to 1 decimal place (a month is 52/12 weeks)."""
    minutes_per_month = runs_per_week * minutes_per_run * WEEKS_PER_MONTH
    return round(minutes_per_month / 60, 1)
