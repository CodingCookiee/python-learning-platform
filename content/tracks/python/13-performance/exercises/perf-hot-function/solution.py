def hottest(report):
    """(function, percent of total time) for the row with the largest tottime."""
    lines = report.splitlines()
    header = next(line for line in lines if line.rstrip().endswith("seconds"))
    total = float(header.split()[-2])

    start = next(i for i, line in enumerate(lines) if line.split()[:1] == ["ncalls"]) + 1
    rows = []
    for line in lines[start:]:
        if line.strip():
            _, tottime, _, _, _, function = line.split(maxsplit=5)
            rows.append((float(tottime), function.strip()))

    tottime, function = max(rows, key=lambda row: row[0])
    return function, round(tottime / total * 100, 1)
