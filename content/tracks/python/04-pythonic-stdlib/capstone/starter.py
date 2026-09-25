"""Log analyzer: the capstone for module 4, Pythonic idioms and the standard library.

Run it with `python log_analyzer.py access.log Europe/London` (or `uv run log_analyzer.py ...`).
The time zone is optional and defaults to UTC.
"""

import re
import sys
from collections import Counter
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

# One named group per field. Finish the pattern: the request line, the status and the size.
LOG_LINE = re.compile(
    r"(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] "
    # TODO: "(?P<method>...) (?P<path>...) <protocol>" (?P<status>...) (?P<size>...)
)
TIME_FORMAT = "%d/%b/%Y:%H:%M:%S %z"
TOP_PATHS = 5
TOP_ERRORS = 3
TOP_HOURS = 3


def parse_line(line):
    """A dict of ip, time (aware datetime), method, path (no query string), status and size,
    or None if line isn't a log entry."""
    # TODO: match LOG_LINE, then convert the time, strip the query string,
    #       and turn status and size into ints ("-" means 0).
    return None


def summarise(lines, zone):
    """The summary dict described in the brief, with times and hours in zone."""
    entries = []
    malformed = 0
    for line in lines:
        # TODO: skip blank lines, count malformed ones, keep the parsed entries.
        pass

    # TODO: one Counter per question: paths, status classes, error paths, hours in zone.
    return {
        "requests": len(entries),
        "visitors": 0,
        "malformed": malformed,
        "first": None,
        "last": None,
        "top_paths": [],
        "classes": {"2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0},
        "errors": [],
        "busiest_hours": [],
    }


def percent(part, whole):
    """part as a percentage of whole, like "26.1%". "0.0%" when whole is 0."""
    # TODO
    return ""


def format_report(name, zone, summary):
    """The whole report, as one string."""
    lines = [f"Log report: {name}", f"Times shown in {zone.key}", ""]
    # TODO: the headline figures, then each section from the sample run.
    return "\n".join(lines)


def main(argv):
    """Read the log named on the command line and print its report."""
    # TODO: the log path is argv[1]; the zone is argv[2] if given, otherwise "UTC".
    #       Print a clear message and sys.exit(1) for a missing file or an unknown zone.
    ...


if __name__ == "__main__":
    main(sys.argv)
