"""splitter.py: split shared expenses in a group and work out who pays whom.

Save this file as splitter.py. It is a library: it never calls print() or input().
Write the program that uses it in a second file, cli.py, with a main() function
behind an  if __name__ == "__main__":  guard.

All money is whole pence (ints) from the moment it is read.
"""


def to_pence(text):
    """Return a money amount like "18.50" or "£18.50" as a whole number of pence.

    Raise ValueError if text isn't a number or isn't positive.
    """
    ...


def format_pence(pence, *, sign=False):
    """Return pence as pounds, like "£12.50" or "-£3.05".

    With sign=True, positive amounts start with "+". Zero is always "£0.00".
    """
    ...


def split_evenly(amount, people):
    """Return {person: share in pence} for amount shared evenly by people.

    Leftover pence go one each to the first people in the list, so the shares
    always add up to amount.
    """
    ...


def parse_expense(line, group):
    """Parse "<name> paid <amount> for <description> [split <name> ...]".

    Return {"payer": ..., "amount": pence, "description": ..., "shared_by": [names]}.
    Without "split", the expense is shared by the whole group. Raise ValueError,
    with a helpful message, for a line that can't be accepted.
    """
    ...


def balances(expenses, group):
    """Return {person: pence} for everyone in group.

    Positive means the group owes that person; negative means they owe the group.
    """
    ...


def settle(totals):
    """Return a list of (debtor, creditor, pence) payments that brings every total to zero.

    Repeatedly, the person who owes most pays the person who is owed most; ties
    are broken alphabetically.
    """
    ...
