import re

LOG_LINE = re.compile(
    r'(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] '
    r'"(?P<method>[A-Z]+) (?P<path>\S+) [^"]*" '
    r"(?P<status>\d{3}) (?P<size>\d+|-)"
)


def parse_line(line):
    """A dict of ip, time, method, path, status and size, or None if line isn't a log entry."""
    m = LOG_LINE.match(line)
    if m is None:
        return None
    entry = m.groupdict()
    entry["status"] = int(entry["status"])
    entry["size"] = 0 if entry["size"] == "-" else int(entry["size"])
    return entry
