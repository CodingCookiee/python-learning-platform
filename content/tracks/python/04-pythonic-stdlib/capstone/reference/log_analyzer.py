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

LOG_LINE = re.compile(
    r"(?P<ip>\S+) \S+ \S+ \[(?P<time>[^\]]+)\] "
    r'"(?P<method>[A-Z]+) (?P<path>\S+) [^"]*" (?P<status>\d{3}) (?P<size>\d+|-)'
    r'(?: "[^"]*" "[^"]*")?\s*'
)
TIME_FORMAT = "%d/%b/%Y:%H:%M:%S %z"
TOP_PATHS = 5
TOP_ERRORS = 3
TOP_HOURS = 3
CLASSES = ("2xx", "3xx", "4xx", "5xx")


def parse_line(line):
    """A dict of ip, time (aware datetime), method, path (no query string), status and size,
    or None if line isn't a log entry."""
    match = LOG_LINE.fullmatch(line.strip())
    if match is None:
        return None
    try:
        time = datetime.strptime(match["time"], TIME_FORMAT)
    except ValueError:
        return None
    return {
        "ip": match["ip"],
        "time": time,
        "method": match["method"],
        "path": match["path"].split("?", 1)[0],
        "status": int(match["status"]),
        "size": 0 if match["size"] == "-" else int(match["size"]),
    }


def summarise(lines, zone):
    """The summary dict described in the brief, with times and hours in zone."""
    entries = []
    malformed = 0
    for line in lines:
        if not line.strip():
            continue
        entry = parse_line(line)
        if entry is None:
            malformed += 1
        else:
            entries.append(entry)

    paths = Counter(entry["path"] for entry in entries)
    classes = Counter(f"{entry['status'] // 100}xx" for entry in entries)
    error_paths = Counter(entry["path"] for entry in entries if entry["status"] >= 400)
    hours = Counter(entry["time"].astimezone(zone).hour for entry in entries)
    times = [entry["time"] for entry in entries]
    return {
        "requests": len(entries),
        "visitors": len({entry["ip"] for entry in entries}),
        "malformed": malformed,
        "first": min(times).astimezone(zone) if times else None,
        "last": max(times).astimezone(zone) if times else None,
        "top_paths": paths.most_common(TOP_PATHS),
        "classes": {name: classes[name] for name in CLASSES},
        "errors": [(path, count, paths[path]) for path, count in error_paths.most_common(TOP_ERRORS)],
        "busiest_hours": sorted(hours.items(), key=lambda item: (-item[1], item[0]))[:TOP_HOURS],
    }


def percent(part, whole):
    """part as a percentage of whole, like "26.1%". "0.0%" when whole is 0."""
    return f"{part / whole * 100:.1f}%" if whole else "0.0%"


def format_report(name, zone, summary):
    """The whole report, as one string."""
    lines = [f"Log report: {name}", f"Times shown in {zone.key}", ""]
    lines += [
        f"{'Requests':<18}{summary['requests']}",
        f"{'Unique visitors':<18}{summary['visitors']}",
        f"{'Malformed lines':<18}{summary['malformed']}",
    ]
    requests = summary["requests"]
    if not requests:
        lines += ["", "No requests to report."]
        return "\n".join(lines)
    lines += [
        f"{'First request':<18}{summary['first']:%Y-%m-%d %H:%M}",
        f"{'Last request':<18}{summary['last']:%Y-%m-%d %H:%M}",
        "",
        "Top paths",
    ]
    lines += [f"{rank:>4}. {path:<22}{count:>4}" for rank, (path, count) in enumerate(summary["top_paths"], 1)]
    lines += ["", "Status codes"]
    lines += [f"  {name}{count:>8}{percent(count, requests):>9}" for name, count in summary["classes"].items()]
    errors = summary["classes"]["4xx"] + summary["classes"]["5xx"]
    lines.append(f"  Error rate (4xx and 5xx): {percent(errors, requests)}")
    if summary["errors"]:
        lines += ["", "Most errors"]
        lines += [
            f"  {path:<22}{count:>3} of {total:<4}({percent(count, total)})"
            for path, count, total in summary["errors"]
        ]
    lines += ["", "Busiest hours"]
    lines += [f"  {hour:02d}:00-{hour:02d}:59{count:>6} requests" for hour, count in summary["busiest_hours"]]
    return "\n".join(lines)


def main(argv):
    """Read the log named on the command line and print its report."""
    if len(argv) not in (2, 3):
        print("usage: python log_analyzer.py <log file> [time zone]")
        sys.exit(1)
    path = Path(argv[1])
    zone_name = argv[2] if len(argv) == 3 else "UTC"
    try:
        zone = ZoneInfo(zone_name)
    except (ZoneInfoNotFoundError, ValueError):
        print(f"Unknown time zone: {zone_name}")
        sys.exit(1)
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except FileNotFoundError:
        print(f"Can't read {argv[1]}: no such file")
        sys.exit(1)
    print(format_report(argv[1], zone, summarise(text.splitlines(), zone)))


if __name__ == "__main__":
    main(sys.argv)
