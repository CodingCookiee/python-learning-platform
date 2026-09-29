def total_bytes(lines):
    """The total of the byte counts at the end of each log line, skipping "-"."""
    return sum(int(line.rsplit(" ", 1)[1]) for line in lines if not line.endswith(" -"))
