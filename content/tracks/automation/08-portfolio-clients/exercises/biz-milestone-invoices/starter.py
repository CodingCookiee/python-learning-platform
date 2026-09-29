from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal


def invoice_schedule(total, milestones, *, start):
    """One invoice per (name, percent, week) milestone, adding up to exactly the total."""
    ...
