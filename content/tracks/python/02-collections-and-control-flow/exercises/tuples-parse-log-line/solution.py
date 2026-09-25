def parse_entry(line):
    """Split "DATE TIME LEVEL message..." into (date, time, level, message)."""
    date, time, level, *words = line.split()
    return date, time, level, " ".join(words)
