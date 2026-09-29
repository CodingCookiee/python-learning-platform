from datetime import date, timedelta

RANK = {"referral": 0, "community": 1, "cold": 2}


def plan_outreach(prospects, *, today, daily_limit, suppressed=()):
    """(email, touch) for today's messages: allowed prospects, warmest and longest-waiting first."""
    ...
