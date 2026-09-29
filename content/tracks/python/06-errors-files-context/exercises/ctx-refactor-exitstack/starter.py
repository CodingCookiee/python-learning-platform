def combine_branch_totals(paths, output):
    """Write one line per day to output, joining every branch's total for that day with commas.
    Returns the number of days written."""
    files = []
    out = open(output, "w", encoding="utf-8")
    try:
        for path in paths:
            files.append(open(path, encoding="utf-8"))
        days = 0
        for totals in zip(*files):
            out.write(",".join(total.strip() for total in totals) + "\n")
            days += 1
    finally:
        for file in files:
            file.close()
        out.close()
    return days
