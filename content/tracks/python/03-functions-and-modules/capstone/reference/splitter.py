"""splitter.py: split shared expenses in a group and work out who pays whom.

A library: it never calls print() or input(). All money is whole pence (ints).
"""

import re
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

EXPENSE = re.compile(r"(?P<payer>\S+) paid (?P<amount>\S+) for (?P<description>.+?)(?: split (?P<names>.+))?")


def to_pence(text):
    """Return a money amount like "18.50" or "£18.50" as a whole number of pence.

    Raise ValueError if text isn't a number or isn't positive.
    """
    cleaned = text.strip().removeprefix("£")
    try:
        pounds = Decimal(cleaned)
    except InvalidOperation:
        raise ValueError(f"not an amount: {text!r}") from None
    if not pounds.is_finite() or pounds <= 0:
        raise ValueError(f"amount must be a positive number: {text!r}")
    return int((pounds * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP))


def format_pence(pence, *, sign=False):
    """Return pence as pounds, like "£12.50" or "-£3.05".

    With sign=True, positive amounts start with "+". Zero is always "£0.00".
    """
    pounds, rest = divmod(abs(pence), 100)
    text = f"£{pounds}.{rest:02d}"
    if pence < 0:
        return "-" + text
    if pence > 0 and sign:
        return "+" + text
    return text


def split_evenly(amount, people):
    """Return {person: share in pence} for amount shared evenly by people.

    Leftover pence go one each to the first people in the list, so the shares
    always add up to amount.
    """
    share, leftover = divmod(amount, len(people))
    return {person: share + (1 if i < leftover else 0) for i, person in enumerate(people)}


def parse_expense(line, group):
    """Parse "<name> paid <amount> for <description> [split <name> ...]".

    Return {"payer": ..., "amount": pence, "description": ..., "shared_by": [names]}.
    Without "split", the expense is shared by the whole group. Raise ValueError,
    with a helpful message, for a line that can't be accepted.
    """
    match = EXPENSE.fullmatch(line.strip())
    if not match:
        raise ValueError("expected <name> paid <amount> for <description> [split <name> ...]")
    payer = match["payer"]
    shared_by = match["names"].split() if match["names"] else list(group)
    for name in [payer, *shared_by]:
        if name not in group:
            raise ValueError(f"Unknown person: {name}")
    return {
        "payer": payer,
        "amount": to_pence(match["amount"]),
        "description": match["description"],
        "shared_by": shared_by,
    }


def balances(expenses, group):
    """Return {person: pence} for everyone in group.

    Positive means the group owes that person; negative means they owe the group.
    """
    totals = {person: 0 for person in group}
    for expense in expenses:
        totals[expense["payer"]] += expense["amount"]
        for person, share in split_evenly(expense["amount"], expense["shared_by"]).items():
            totals[person] -= share
    return totals


def settle(totals):
    """Return a list of (debtor, creditor, pence) payments that brings every total to zero.

    Repeatedly, the person who owes most pays the person who is owed most; ties
    are broken alphabetically.
    """
    remaining = dict(totals)
    payments = []
    while any(remaining.values()):
        debtor = min((pence, name) for name, pence in remaining.items() if pence < 0)[1]
        creditor = min((-pence, name) for name, pence in remaining.items() if pence > 0)[1]
        amount = min(-remaining[debtor], remaining[creditor])
        remaining[debtor] += amount
        remaining[creditor] -= amount
        payments.append((debtor, creditor, amount))
    return payments
