"""Acceptance tests for the log analyzer, run by GitHub Actions in your repository.

They import parse_line and summarise from log_analyzer.py, and run
`python log_analyzer.py <log file> [time zone]` on the sample log and on bad input.
"""

import importlib
import subprocess
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import pytest

PROGRAM = Path("log_analyzer.py")
UTC = timezone.utc

SAMPLE_LOG = """\
203.0.113.9 - - [25/Sep/2026:08:02:11 +0000] "GET / HTTP/1.1" 200 5123
203.0.113.9 - - [25/Sep/2026:08:02:15 +0000] "GET /products?page=2 HTTP/1.1" 200 8811
198.51.100.4 - - [25/Sep/2026:08:15:40 +0000] "GET /products HTTP/1.1" 200 8790
198.51.100.4 - - [25/Sep/2026:08:16:02 +0000] "GET /cart HTTP/1.1" 200 2210
198.51.100.4 - - [25/Sep/2026:08:16:30 +0000] "POST /pay HTTP/1.1" 502 -
198.51.100.4 - - [25/Sep/2026:08:17:05 +0000] "POST /pay HTTP/1.1" 200 312
192.0.2.77 - - [25/Sep/2026:09:01:12 +0000] "GET /products/mug-0042 HTTP/1.1" 200 4410
192.0.2.77 - - [25/Sep/2026:09:01:50 +0000] "GET /favicon.ico HTTP/1.1" 404 153
192.0.2.77 - - [25/Sep/2026:09:03:12 +0000] "GET /cart HTTP/1.1" 200 2230
server restarted by deploy 4471
203.0.113.9 - - [25/Sep/2026:13:40:01 +0000] "GET /products HTTP/1.1" 200 8790
203.0.113.9 - - [25/Sep/2026:13:40:09 +0000] "GET /products/tea-0107 HTTP/1.1" 200 4380
203.0.113.9 - - [25/Sep/2026:13:41:30 +0000] "GET /cart HTTP/1.1" 200 2240
203.0.113.9 - - [25/Sep/2026:13:42:02 +0000] "POST /pay HTTP/1.1" 500 -
203.0.113.9 - - [25/Sep/2026:13:42:40 +0000] "POST /pay HTTP/1.1" 200 312
233.252.0.5 - - [25/Sep/2026:13:55:00 +0000] "GET /admin HTTP/1.1" 403 199
233.252.0.5 - - [25/Sep/2026:13:55:01 +0000] "GET /wp-login.php HTTP/1.1" 404 153
233.252.0.5 - - [25/Sep/2026:13:55:02 +0000] "GET /.env HTTP/1.1" 404 153
192.0.2.10 - - [25/Sep/2026:14:10:10 +0000] "GET / HTTP/1.1" 200 5123
192.0.2.10 - - [25/Sep/2026:14:10:44 +0000] "GET /products?sort=price HTTP/1.1" 200 8801
192.0.2.10 - - [25/Sep/2026:14:12:00 +0000] "GET /old-sale HTTP/1.1" 301 0
192.0.2.10 - - [25/Sep/2026:14:12:01 +0000] "GET /sale HTTP/1.1" 200 6021
198.51.100.23 - - [25/Sep/2026:22:58:31 +0000] "GET / HTTP/1.1" 200 5123
198.51.100.23 - - [25/Sep/2026:23:30:12 +0000] "GET /products HTTP/1.1" 200 8790
GET /cart 200
"""

LONDON_REPORT = """\
Log report: access.log
Times shown in Europe/London

Requests          23
Unique visitors   6
Malformed lines   2
First request     2026-09-25 09:02
Last request      2026-09-26 00:30

Top paths
   1. /products                5
   2. /pay                     4
   3. /                        3
   4. /cart                    3
   5. /products/mug-0042       1

Status codes
  2xx      16    69.6%
  3xx       1     4.3%
  4xx       4    17.4%
  5xx       2     8.7%
  Error rate (4xx and 5xx): 26.1%

Most errors
  /pay                    2 of 4   (50.0%)
  /favicon.ico            1 of 1   (100.0%)
  /admin                  1 of 1   (100.0%)

Busiest hours
  14:00-14:59     8 requests
  09:00-09:59     6 requests
  15:00-15:59     4 requests"""


def analyzer():
    """The learner's log_analyzer module."""
    assert PROGRAM.exists(), "log_analyzer.py should be at the top of your repository"
    return importlib.import_module("log_analyzer")


def run(tmp_path: Path, *args: str, log: str | None = SAMPLE_LOG) -> subprocess.CompletedProcess[str]:
    """Run the program in a temporary folder that holds access.log (unless log is None)."""
    assert PROGRAM.exists(), "log_analyzer.py should be at the top of your repository"
    if log is not None:
        (tmp_path / "access.log").write_text(log, encoding="utf-8")
    return subprocess.run(
        [sys.executable, str(PROGRAM.resolve()), *args],
        cwd=tmp_path,
        capture_output=True,
        text=True,
        timeout=30,
    )


def collapsed(text: str) -> list[str]:
    """The non-blank lines of some output, with each run of spaces collapsed to one."""
    return [" ".join(line.split()) for line in text.splitlines() if line.strip()]


def test_parse_line_returns_the_fields_from_the_brief():
    entry = analyzer().parse_line('203.0.113.9 - - [25/Sep/2026:13:42:02 +0000] "POST /pay HTTP/1.1" 500 -')
    assert entry == {
        "ip": "203.0.113.9",
        "time": datetime(2026, 9, 25, 13, 42, 2, tzinfo=UTC),
        "method": "POST",
        "path": "/pay",
        "status": 500,
        "size": 0,
    }
    assert entry["time"].utcoffset() == timedelta(0), "time should be an aware datetime, parsed with %z"


def test_parse_line_strips_the_query_string_and_reads_the_combined_format():
    parse_line = analyzer().parse_line
    entry = parse_line('203.0.113.9 - - [25/Sep/2026:08:02:15 +0000] "GET /products?page=2 HTTP/1.1" 200 8811')
    assert entry is not None and entry["path"] == "/products" and entry["size"] == 8811
    combined = parse_line(
        '192.0.2.77 - ada [25/Sep/2026:23:59:59 +0530] "GET /account HTTP/2.0" 304 0 '
        '"https://shop.example/" "Mozilla/5.0"'
    )
    assert combined is not None, "A combined-format line (with referrer and browser at the end) should parse"
    assert combined["path"] == "/account" and combined["status"] == 304 and combined["ip"] == "192.0.2.77"
    assert combined["time"] == datetime(2026, 9, 25, 18, 29, 59, tzinfo=UTC), "Keep the line's own UTC offset"


def test_parse_line_returns_none_for_anything_that_isnt_a_log_entry():
    parse_line = analyzer().parse_line
    for line in [
        "server restarted by deploy 4471",
        "GET /cart 200",
        "",
        '203.0.113.9 - - [31/Sep/2026:10:00:00 +0000] "GET / HTTP/1.1" 200 5123',
        '203.0.113.9 - - [25/Sep/2026:10:00:00 +0000] "GET / HTTP/1.1" OK 5123',
    ]:
        assert parse_line(line) is None, f"parse_line should return None for {line!r}"


def test_summarise_the_sample_in_utc():
    summary = analyzer().summarise(SAMPLE_LOG.splitlines(), ZoneInfo("UTC"))
    expected = {
        "requests": 23,
        "visitors": 6,
        "malformed": 2,
        "top_paths": [("/products", 5), ("/pay", 4), ("/", 3), ("/cart", 3), ("/products/mug-0042", 1)],
        "classes": {"2xx": 16, "3xx": 1, "4xx": 4, "5xx": 2},
        "errors": [("/pay", 2, 4), ("/favicon.ico", 1, 1), ("/admin", 1, 1)],
        "busiest_hours": [(13, 8), (8, 6), (14, 4)],
    }
    for key, value in expected.items():
        got = summary.get(key)
        if isinstance(value, list) and isinstance(got, list):
            got = [tuple(item) for item in got]
        assert got == value, f"summary[{key!r}] should be {value!r}, got {summary.get(key)!r}"
    assert summary["first"] == datetime(2026, 9, 25, 8, 2, 11, tzinfo=UTC)
    assert summary["last"] == datetime(2026, 9, 25, 23, 30, 12, tzinfo=UTC)


def test_summarise_converts_times_and_hours_to_the_zone():
    summary = analyzer().summarise(SAMPLE_LOG.splitlines(), ZoneInfo("Europe/London"))
    assert [tuple(item) for item in summary["busiest_hours"]] == [(14, 8), (9, 6), (15, 4)], (
        "Busiest hours should be hours of the day in Europe/London (UTC+1 in September)"
    )
    first, last = summary["first"], summary["last"]
    assert (first.day, first.hour, first.minute) == (25, 9, 2), "first should be converted to the zone"
    assert (last.day, last.hour, last.minute) == (26, 0, 30), "last should be converted to the zone: 00:30 on the 26th"
    karachi = analyzer().summarise(SAMPLE_LOG.splitlines(), ZoneInfo("Asia/Karachi"))
    assert tuple(karachi["busiest_hours"][0]) == (18, 8)


def test_summarise_ignores_blank_lines_and_breaks_hour_ties_by_the_earlier_hour():
    lines = [
        "",
        '10.0.0.1 - - [25/Sep/2026:15:00:00 +0000] "GET / HTTP/1.1" 200 1',
        "   ",
        '10.0.0.1 - - [25/Sep/2026:03:00:00 +0000] "GET / HTTP/1.1" 200 1',
        '10.0.0.1 - - [25/Sep/2026:09:00:00 +0000] "GET / HTTP/1.1" 200 1',
        '10.0.0.1 - - [25/Sep/2026:21:00:00 +0000] "GET / HTTP/1.1" 200 1',
        "not a log line",
    ]
    summary = analyzer().summarise(lines, ZoneInfo("UTC"))
    assert summary["requests"] == 4 and summary["visitors"] == 1
    assert summary["malformed"] == 1, "Blank lines are skipped, not counted as malformed"
    assert [tuple(item) for item in summary["busiest_hours"]] == [(3, 1), (9, 1), (15, 1)], (
        "Hours with the same count should be listed earliest first"
    )


def test_summarise_with_no_requests():
    summary = analyzer().summarise(["", "server restarted"], ZoneInfo("UTC"))
    assert summary["requests"] == 0 and summary["malformed"] == 1
    assert summary["first"] is None and summary["last"] is None
    assert summary["classes"] == {"2xx": 0, "3xx": 0, "4xx": 0, "5xx": 0}
    assert list(summary["top_paths"]) == [] and list(summary["busiest_hours"]) == []


def test_sample_report_in_europe_london(tmp_path):
    result = run(tmp_path, "access.log", "Europe/London")
    assert result.returncode == 0, f"The program crashed:\n{result.stderr[-1500:]}"
    assert collapsed(result.stdout) == collapsed(LONDON_REPORT), (
        "The report should have the same lines, words and figures as the sample (spacing may differ):\n"
        + result.stdout
    )


def test_report_defaults_to_utc(tmp_path):
    result = run(tmp_path, "access.log")
    assert result.returncode == 0, f"The program crashed:\n{result.stderr[-1500:]}"
    lines = collapsed(result.stdout)
    for expected in [
        "Times shown in UTC",
        "First request 2026-09-25 08:02",
        "Last request 2026-09-25 23:30",
        "13:00-13:59 8 requests",
        "08:00-08:59 6 requests",
        "14:00-14:59 4 requests",
    ]:
        assert expected in lines, f"Expected a line {expected!r} (spacing aside) in the UTC report:\n{result.stdout}"


def test_report_columns_line_up(tmp_path):
    result = run(tmp_path, "access.log", "Europe/London")
    lines = result.stdout.splitlines()
    assert "Status codes" in lines, f"No Status codes section:\n{result.stdout}"
    start = lines.index("Status codes") + 1
    rows = [line.rstrip() for line in lines[start : start + 4]]
    assert len({len(row) for row in rows}) == 1, (
        "The status code rows should line up, with the percentages right-aligned:\n" + "\n".join(rows)
    )


def test_missing_file_and_unknown_zone_exit_with_status_1(tmp_path):
    missing = run(tmp_path, "missing.log", log=None)
    assert missing.returncode == 1, f"A missing file should exit with status 1, got {missing.returncode}"
    assert "Traceback" not in missing.stderr, f"A missing file shouldn't print a traceback:\n{missing.stderr}"
    assert "Can't read missing.log: no such file" in missing.stdout + missing.stderr

    zone = run(tmp_path, "access.log", "Mars/Olympus_Mons")
    assert zone.returncode == 1, f"An unknown time zone should exit with status 1, got {zone.returncode}"
    assert "Traceback" not in zone.stderr, f"An unknown zone shouldn't print a traceback:\n{zone.stderr}"
    assert "Unknown time zone: Mars/Olympus_Mons" in zone.stdout + zone.stderr


@pytest.mark.parametrize("log", ["", "server restarted\n\n"], ids=["empty file", "only malformed lines"])
def test_a_log_with_no_requests_still_prints_a_report(tmp_path, log):
    result = run(tmp_path, "access.log", log=log)
    assert result.returncode == 0 and "Traceback" not in result.stderr, f"The program crashed:\n{result.stderr[-1500:]}"
    lines = collapsed(result.stdout)
    assert "Requests 0" in lines, f"The report should still show the headline counts:\n{result.stdout}"
    assert "No requests to report." in lines, f"Expected 'No requests to report.':\n{result.stdout}"


def test_importing_it_prints_nothing():
    assert PROGRAM.exists(), "log_analyzer.py should be at the top of your repository"
    result = subprocess.run(
        [sys.executable, "-c", "import log_analyzer"], input="", capture_output=True, text=True, timeout=20
    )
    assert result.returncode == 0, f'Importing log_analyzer.py failed: keep main(sys.argv) under if __name__ == "__main__":\n{result.stderr[-800:]}'
    assert result.stdout == "", f"Importing log_analyzer.py printed something: {result.stdout!r}"
