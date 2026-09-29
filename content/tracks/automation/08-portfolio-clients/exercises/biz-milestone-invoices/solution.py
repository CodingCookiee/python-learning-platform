from datetime import date, timedelta
from decimal import ROUND_HALF_UP, Decimal


def invoice_schedule(total, milestones, *, start):
    """One invoice per (name, percent, week) milestone, adding up to exactly the total."""
    percents = sum(percent for _, percent, _ in milestones)
    if percents != 100:
        raise ValueError(f"the percentages add up to {percents}, not 100")
    weeks = [week for _, _, week in milestones]
    if weeks != sorted(weeks):
        raise ValueError("milestones must be in date order")

    total = Decimal(total)
    schedule = []
    invoiced = Decimal("0")
    for index, (name, percent, week) in enumerate(milestones):
        if index == len(milestones) - 1:
            amount = total - invoiced
        else:
            amount = (total * percent / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        invoiced += amount
        schedule.append({"milestone": name, "amount": amount, "due": start + timedelta(weeks=week)})
    return schedule
