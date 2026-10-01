"""cli.py: the command line for the expense splitter. Run it with  python cli.py"""

from splitter import balances, format_pence, parse_expense, settle


def read_expenses(group):
    """Return the expenses typed until a blank line, skipping (and explaining) bad ones."""
    expenses = []
    while line := input("> ").strip():
        try:
            expenses.append(parse_expense(line, group))
        except ValueError as error:
            print(f"Skipped: {error}")
    return expenses


def report_lines(totals, payments):
    """Return the lines of the balances and settle-up report."""
    width = max(len(name) for name in totals)
    amounts = {name: format_pence(pence, sign=True) for name, pence in totals.items()}
    amount_width = max(len(text) for text in amounts.values())
    lines = ["", "Balances"]
    lines += [f"  {name:<{width}}   {amounts[name]:>{amount_width}}" for name in totals]
    lines += ["", "To settle up"]
    if payments:
        lines += [f"  {debtor} pays {creditor} {format_pence(pence)}" for debtor, creditor, pence in payments]
    else:
        lines.append("  Everyone is square.")
    return lines


def main():
    """Ask for the group and the expenses, then print the balances and the payments."""
    group = input("Who's in the group? ").split()
    expenses = read_expenses(group)
    totals = balances(expenses, group)
    for line in report_lines(totals, settle(totals)):
        print(line)


if __name__ == "__main__":
    main()
