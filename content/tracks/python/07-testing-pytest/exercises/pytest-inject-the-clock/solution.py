from datetime import timedelta

TRIAL_DAYS = 14


def trial_days_left(signed_up, today):
    """Days left in a 14-day free trial that started on signed_up, never below 0."""
    ends = signed_up + timedelta(days=TRIAL_DAYS)
    return max(0, (ends - today).days)


def trial_banner(signed_up, today):
    """The message shown at the top of the app during and after the trial."""
    days = trial_days_left(signed_up, today)
    if days == 0:
        return "Your free trial has ended"
    if days == 1:
        return "1 day left in your free trial"
    return f"{days} days left in your free trial"
