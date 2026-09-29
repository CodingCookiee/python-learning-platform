"""Streaming ETL for Harbour Lane Outfitters: access log in, hourly traffic stats out.

Run it with:
    python etl.py                      # a generated 1,000,000-line log (never stored anywhere)
    python etl.py --generate 200000    # a smaller generated log
    python etl.py path/to/access.log   # a real log file

Nothing in this file may hold the whole log in memory. Every stage takes an iterator and
yields an iterator, and only the hourly stage keeps anything: one hour's response times.
"""

import csv
import random
import statistics
import sys
import time
import tracemalloc
from collections import Counter
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from functools import wraps
from itertools import batched, groupby


# ---------------------------------------------------------------------------
# Test data: a log of any length, generated one line at a time (given, don't change)
# ---------------------------------------------------------------------------

PATHS = [
    "/", "/products", "/products/waxed-jacket", "/products/wool-socks", "/products/field-boots",
    "/cart", "/checkout", "/api/stock", "/search", "/account",
    "/static/app.js", "/static/site.css", "/static/logo.png", "/health",
]
PATH_WEIGHTS = [14, 12, 8, 8, 6, 6, 3, 6, 7, 3, 9, 9, 6, 3]
STATUSES = [200, 304, 404, 500, 502, 503]
STATUS_WEIGHTS = [86, 6, 5, 1, 1, 1]


def generate_log(count, *, seed=8, start=datetime(2026, 9, 28, tzinfo=timezone.utc)):
    """Yield `count` access-log lines, lazily. About 1 in 250 is malformed on purpose.

    A line looks like:  2026-09-28T09:15:02Z GET /products/wool-socks 200 5120 38
    (timestamp, method, path, status, bytes sent, milliseconds taken)
    """
    rng = random.Random(seed)
    at = start
    for _ in range(count):
        at += timedelta(seconds=rng.random() * 0.5)
        path = rng.choices(PATHS, PATH_WEIGHTS)[0]
        method = "POST" if path in ("/cart", "/checkout") and rng.random() < 0.5 else "GET"
        status = rng.choices(STATUSES, STATUS_WEIGHTS)[0]
        size = 0 if status == 304 else rng.randrange(200, 60_000)
        ms = max(1, int(rng.lognormvariate(3.6, 0.7)))
        line = f"{at:%Y-%m-%dT%H:%M:%SZ} {method} {path} {status} {size} {ms}"
        damage = rng.random()
        if damage < 0.002:
            line = line[: line.rindex(" ")]                # cut off: a field is missing
        elif damage < 0.003:
            line = line.replace(f" {status} ", " - ", 1)   # the status was never written
        elif damage < 0.004:
            line = line.replace("-09-", "-13-", 1)         # a corrupted date
        yield line


class FakeWarehouse:
    """Stands in for the analytics warehouse's bulk API (given, don't change).

    send_batch(rows) stores a list of rows. The second and fifth calls fail with
    ConnectionError, the way the real one drops a connection now and then.
    """

    def __init__(self):
        self.calls = 0
        self.rows = []

    def send_batch(self, rows):
        self.calls += 1
        if self.calls in (2, 5):
            raise ConnectionError("warehouse connection reset")
        self.rows.extend(rows)
        return len(rows)


# ---------------------------------------------------------------------------
# Records
# ---------------------------------------------------------------------------


@dataclass(frozen=True, slots=True)
class Request:
    at: datetime
    method: str
    path: str
    status: int
    bytes: int
    ms: int


@dataclass(frozen=True)
class HourStats:
    hour: datetime
    requests: int
    errors: int
    error_rate: float
    p95_ms: int
    bytes: int


# ---------------------------------------------------------------------------
# Decorators
# ---------------------------------------------------------------------------

METRICS = {}   # stage name -> {"items": ..., "seconds": ...}, filled in by @instrumented
BATCH_SIZE = 12  # hourly rows per warehouse request


def instrumented(name, metrics, clock=time.perf_counter):
    """Decorator factory for generator functions: count the items each stage yields and the
    time spent producing them, in metrics[name]. The decorated function must stay a lazy
    generator function."""
    ...


def retry(times=3, *, exceptions=(ConnectionError, TimeoutError), delay=0.5, sleep=time.sleep):
    """Decorator factory: retry on the given exceptions, waiting delay, 2 * delay, 4 * delay..."""
    ...


@contextmanager
def run_report(metrics, rejects, description, *, clock=time.perf_counter, out=print):
    """Print the run's header, then, however the run ends, the stage table and rejects."""
    ...


# ---------------------------------------------------------------------------
# The pipeline: every stage takes an iterator and yields an iterator
# ---------------------------------------------------------------------------


def read_log(path):
    """Yield the lines of a log file without their line endings, one at a time."""
    ...


def parse(lines, rejects):
    """Yield a Request for each well-formed line. Count each rejected line in the
    rejects Counter under "field count", "timestamp" or "number"."""
    ...


def pages(requests):
    """Drop static assets (/static/...) and health checks (/health)."""
    ...


def hourly(requests):
    """Yield one HourStats per hour of time-ordered requests, as soon as each hour ends."""
    ...


def write_csv(rows, path):
    """Write each HourStats to a CSV file as it arrives, and yield it on unchanged."""
    ...


def load(rows, client, *, batch_size=BATCH_SIZE, sleep=time.sleep):
    """Send rows to the warehouse in batches, retrying dropped connections. Returns the
    number of rows loaded."""
    ...


# ---------------------------------------------------------------------------
# Wiring (given): you shouldn't need to change this
# ---------------------------------------------------------------------------


def main(argv):
    if argv and argv[0] != "--generate":
        lines, description = read_log(argv[0]), argv[0]
    else:
        count = int(argv[1]) if len(argv) > 1 else 1_000_000
        lines, description = generate_log(count), f"{count:,} generated lines (seed 8)"

    rejects = Counter()
    warehouse = FakeWarehouse()
    tracemalloc.start()
    with run_report(METRICS, rejects, description):
        stats = write_csv(hourly(pages(parse(lines, rejects))), "hourly.csv")
        loaded = load(stats, warehouse)
        batches = -(-loaded // BATCH_SIZE)
        print(f"Loaded {loaded} hours into the warehouse in {batches} batches ({warehouse.calls - batches} retries)")
    _, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    print(f"Peak memory: {peak / 1_000_000:.1f} MB")


if __name__ == "__main__":
    main(sys.argv[1:])
