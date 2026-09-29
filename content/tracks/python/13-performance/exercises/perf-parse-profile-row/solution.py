def parse_row(line):
    """One row of pstats output as (calls, tottime, cumtime, function)."""
    calls, tottime, _, cumtime, _, function = line.split(maxsplit=5)
    return int(calls.split("/")[0]), float(tottime), float(cumtime), function.strip()
