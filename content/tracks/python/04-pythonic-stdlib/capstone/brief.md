An online shop's web server writes one line for every request it handles, thousands a day. Nobody
reads them, so nobody noticed that half of all payment attempts fail, or that a bot spends
every afternoon probing for admin pages. You're going to write the tool that reads the log and says
what's going on: which pages are busiest, how often requests fail, and when the traffic peaks, in
the time zone the shop actually works in.

This project uses nearly every lesson in the module: a compiled regex with named groups, aware
datetimes and `zoneinfo`, `Counter` for all the counting, `pathlib` to read the file, and EAFP to
survive bad lines. Build it in your own editor and run it from a terminal.

## The log format

Each line is in the **common log format** that Apache, nginx and most other web servers write:

```text
203.0.113.9 - - [25/Sep/2026:13:42:02 +0000] "POST /pay HTTP/1.1" 500 -
```

| Part | Example | Notes |
|------|---------|-------|
| Client IP address | `203.0.113.9` | One visitor, for this report |
| Two unused fields | `- -` | Usually `-`. The second is sometimes a user name |
| Time | `[25/Sep/2026:13:42:02 +0000]` | Always with an offset from UTC |
| Request line | `"POST /pay HTTP/1.1"` | Method, path (maybe with a `?query`), protocol |
| Status code | `500` | 2xx success, 3xx redirect, 4xx client error, 5xx server error |
| Size | `-` | Bytes sent, or `-` when nothing was |

Some servers add two more quoted fields at the end (the referring page and the browser), which is
called the **combined** format. Your parser should accept both and ignore the extra fields.

Save this sample as `access.log`. It has 25 lines: 23 requests, and 2 lines that aren't log entries
at all.

```text
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
```

## A sample run

The shop is in London, so its staff want times in `Europe/London`. In September that's an hour
ahead of UTC, which is why the last request, at 23:30 UTC, shows as half past midnight the next day:

```text
$ python log_analyzer.py access.log Europe/London
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
  15:00-15:59     4 requests
```

Without a time zone, the report uses UTC. Everything is the same except the times:

```text
$ python log_analyzer.py access.log
...
First request     2026-09-25 08:02
Last request      2026-09-25 23:30
...
Busiest hours
  13:00-13:59     8 requests
  08:00-08:59     6 requests
  14:00-14:59     4 requests
```

Your spacing doesn't have to match character for character, but the figures do, and the columns
should line up.

## Requirements

### Structure

Write everything in `log_analyzer.py`, as four functions plus a main block. The review runs hidden
tests that import the first two, so keep their names and signatures exactly:

- **`parse_line(line)`** parses one line (details below) and returns a dict, or `None`.
- **`summarise(lines, zone)`** takes a list of lines and a `ZoneInfo`, and returns the summary dict
  described below. It prints nothing.
- **`format_report(name, zone, summary)`** returns the whole report as one string.
- **`main(argv)`** reads the command-line arguments, reads the file, and prints the report. Call it
  as `main(sys.argv)` under `if __name__ == "__main__":`, so that importing the file does nothing.

### Parsing a line

`parse_line` uses one regular expression, written as a raw string, compiled once at the top of the
file, with a named group for each field. For a log entry it returns:

```python norun
{"ip": "203.0.113.9", "time": datetime(2026, 9, 25, 13, 42, 2, tzinfo=timezone.utc),
 "method": "POST", "path": "/pay", "status": 500, "size": 0}
```

- `time` is an **aware** `datetime`, parsed with `strptime` and `%z`.
- `path` has any query string removed: `/products?page=2` counts as `/products`.
- `status` and `size` are ints, and a size of `-` is `0`.
- Anything that doesn't match the pattern, or has a time that doesn't parse, returns `None`.

### Summarising

`summarise` skips blank lines, counts the lines that `parse_line` rejects, and returns a dict with
these keys:

| Key | Value |
|-----|-------|
| `requests` | the number of parsed requests |
| `visitors` | the number of different IP addresses |
| `malformed` | the number of non-blank lines that didn't parse |
| `first`, `last` | the earliest and latest request times, converted to `zone`, or `None` if there are no requests |
| `top_paths` | the 5 most requested paths as `(path, count)` pairs, most first (ties in the order the paths first appear) |
| `classes` | `{"2xx": n, "3xx": n, "4xx": n, "5xx": n}`, including classes with a count of 0 |
| `errors` | the 3 paths with the most 4xx and 5xx responses, as `(path, errors, requests)` triples |
| `busiest_hours` | the 3 busiest hours of the day in `zone`, as `(hour, count)` pairs with `hour` from 0 to 23, most first, ties going to the earlier hour |

Use `Counter` for the counting. `most_common` gives you `top_paths` and `errors` directly.

### The report

`format_report` lays the summary out as in the sample run: the headline figures, the numbered top
paths, each status class with its count and percentage of all requests, the overall error rate, the
paths with the most errors and their own error rate, and the busiest hours. Percentages have one
decimal place. If there are no requests at all, print the headline counts and then
`No requests to report.` instead of the other sections, rather than dividing by zero.

### Bad input

The program must never end with a traceback:

- A missing file prints `Can't read <path>: no such file` and exits with status 1
  (`sys.exit(1)`).
- An unknown time zone name prints `Unknown time zone: <name>` and exits with status 1.
- An empty file, or one with nothing but malformed lines, still prints a report.

## Getting started

1. Make a project folder, save the sample as `access.log` and the starter code as
   `log_analyzer.py`. If you're on Windows, run `uv add tzdata` (or `pip install tzdata`) first:
   Windows has no time zone database of its own, and `zoneinfo` needs one.
2. Write `parse_line` first, and try it on a few sample lines from the REPL. The "Parse a
   web-server log line" drill from lesson 6 is most of it.
3. Write `summarise` one key at a time, printing the dict as you go. Check each figure against the
   sample report.
4. Write `format_report` last. When the sample matches, try the bad inputs below.

### Two things the lessons didn't cover

- **Command-line arguments.** `sys.argv` is the list of words on the command line, starting with
  the script's own name: for `python log_analyzer.py access.log Europe/London` it's
  `["log_analyzer.py", "access.log", "Europe/London"]`. Module 10 introduces `argparse`, which
  does this properly.
- **Catching an unknown zone.** `ZoneInfo("Europe/Lodnon")` raises
  `zoneinfo.ZoneInfoNotFoundError`, which you can import from `zoneinfo` and catch like any other
  exception. A missing file raises `FileNotFoundError`.

## Try these inputs

- The sample log, with no time zone, with `Europe/London`, and with `Asia/Karachi` (five hours
  ahead of UTC, so the busiest hour becomes 18:00).
- An empty file, and a file containing only `server restarted`.
- A file that doesn't exist, and the time zone `Mars/Olympus_Mons`.
- The sample log with a combined-format line added at the end:
  `192.0.2.77 - ada [25/Sep/2026:23:59:59 +0000] "GET /account HTTP/2.0" 304 0 "https://shop.example/" "Mozilla/5.0"`.
- A line with a real shape but an impossible date, such as `[31/Sep/2026:10:00:00 +0000]`. It
  should count as malformed.

## Stretch goals

Pick any you like once the requirements work:

- **JSON output.** Add a `--json` flag that prints the summary as JSON instead of the report.
  Datetimes need converting first (lesson 7), and `(path, count)` pairs come out as lists.
- **A time window.** Accept `--since 2026-09-25T12:00` and only count requests from then on,
  interpreting the time in the chosen zone.
- **An hourly chart.** Print all 24 hours with a bar of `#` characters scaled so the busiest hour is
  40 characters wide.
- **Suspicious visitors.** List IP addresses with more than 2 requests that all failed, the kind of
  pattern the bot in the sample leaves.
- **Bytes served.** Add the total response size, shown as `1.2 MB` or `830.4 KB`.
- **Tests.** Write pytest tests for `parse_line` and `summarise` using small lists of lines. Module 7
  shows how, but plain `assert` statements in a `test_log_analyzer.py` work with pytest already.

## How to submit

Push `log_analyzer.py`, the sample `access.log` and a short `README.md` (what the tool does and the
command to run it) to a GitHub repository, and submit its link on this capstone's page. The review
runs hidden tests against `parse_line` and `summarise`, runs the program on the sample log and on bad
input, then reads your code against the criteria: correct figures, `Counter` for counting, aware
datetimes throughout, no crashes, a compiled regex and small pure functions.
