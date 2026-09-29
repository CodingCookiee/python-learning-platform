import pandas as pd

COLUMNS = ["week", "applied", "responses", "interviews", "offers", "response_rate"]


def weekly_summary(conn):
    """A CSV report, one row per week (every week from the first to the last), as a string."""
    ...
