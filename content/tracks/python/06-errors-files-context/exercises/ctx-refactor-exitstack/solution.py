from contextlib import ExitStack


def combine_branch_totals(paths, output):
    """Write one line per day to output, joining every branch's total for that day with commas.
    Returns the number of days written."""
    with ExitStack() as stack:
        out = stack.enter_context(open(output, "w", encoding="utf-8"))
        files = [stack.enter_context(open(path, encoding="utf-8")) for path in paths]
        days = 0
        for totals in zip(*files):
            out.write(",".join(total.strip() for total in totals) + "\n")
            days += 1
    return days
