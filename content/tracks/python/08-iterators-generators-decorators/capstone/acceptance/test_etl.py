"""Acceptance tests for the streaming ETL, run by GitHub Actions in your repository.

They run `python etl.py --generate 200000` (and on a log file) in a temporary folder and check
the counts against the brief, then import etl.py and check each stage and decorator on a
handful of lines.
"""

import functools
import importlib
import inspect
import re
import subprocess
import sys
import tempfile
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest

PROGRAM = Path("etl.py")
UTC = timezone.utc

SAMPLE_COUNTS = [
    "Streaming ETL: 200,000 generated lines (seed 8)",
    "Loaded 14 hours into the warehouse: 2 batches, 1 retried",
    "Stage          Items   Seconds",
    "parse        199,208",
    "pages        145,184",
    "hourly            14",
    "csv               14",
    "Rejected: 792 lines (field count 404, timestamp 199, number 189)",
]


def etl():
    """The learner's etl module."""
    assert PROGRAM.exists(), "etl.py should be at the top of your repository"
    return importlib.import_module("etl")


def run(folder: Path, *args: str, timeout: int = 600) -> subprocess.CompletedProcess[str]:
    assert PROGRAM.exists(), "etl.py should be at the top of your repository"
    return subprocess.run(
        [sys.executable, str(PROGRAM.resolve()), *args], cwd=folder, capture_output=True, text=True, timeout=timeout
    )


@functools.cache
def sample_run() -> tuple[subprocess.CompletedProcess[str], str]:
    """`python etl.py --generate 200000`, and the hourly.csv it wrote."""
    folder = Path(tempfile.mkdtemp(prefix="pylearn-etl-"))
    result = run(folder, "--generate", "200000")
    csv_file = folder / "hourly.csv"
    return result, csv_file.read_text(encoding="utf-8") if csv_file.exists() else ""


def counts(output: str) -> list[str]:
    """The output with each stage row's seconds column removed, and without the timing lines."""
    lines = []
    for line in output.splitlines():
        if re.match(r"(Finished in|Failed after|Peak memory)", line) or not line.strip():
            continue
        match = re.fullmatch(r"(\S+\s+[\d,]+)\s+\d+\.\d\d", line.rstrip())
        lines.append(match.group(1) if match and not line.startswith("Stage") else line.rstrip())
    return lines


def fake_clock(start: float, end: float):
    """A clock that reads start the first time, and end every time after that."""
    readings = iter([start])
    return lambda: next(readings, end)


def request(at: str, path: str = "/", status: int = 200, size: int = 100, ms: int = 10):
    return etl().Request(datetime.fromisoformat(at), "GET", path, status, size, ms)


def test_sample_run_prints_the_counts_from_the_brief():
    result, _ = sample_run()
    assert result.returncode == 0, f"python etl.py --generate 200000 crashed:\n{result.stderr[-1500:]}"
    assert counts(result.stdout) == SAMPLE_COUNTS, (
        "Every count should match the sample run (the seconds and memory can differ):\n" + result.stdout
    )
    assert re.search(r"^Finished in \d+(\.\d+)?s$", result.stdout, re.M), "The report should end with Finished in <seconds>s"


def test_sample_run_writes_hourly_csv():
    result, text = sample_run()
    assert text, f"python etl.py --generate 200000 didn't write hourly.csv:\n{result.stderr[-1500:]}"
    lines = text.splitlines()
    assert lines[:3] == [
        "hour,requests,errors,error_rate,p95_ms,bytes",
        "2026-09-28T00:00:00+00:00,10464,284,0.0271,112,294863318",
        "2026-09-28T01:00:00+00:00,10418,298,0.0286,114,292455680",
    ]
    assert len(lines) == 15, f"hourly.csv should have a header and 14 hourly rows, not {len(lines) - 1}"


def test_parse_yields_requests_and_counts_each_rejected_line():
    module = etl()
    rejects = Counter()
    lines = [
        "garbage",
        "2026-13-28T09:00:00Z GET / 200 10 5",
        "2026-09-28T09:00:00Z GET / - 10 5",
        "2026-09-28T09:15:02Z GET /products/wool-socks 200 5120 38",
        "2026-09-28T09:15:03Z POST /cart 503 0 7 extra",
    ]
    stage = module.parse(iter(lines), rejects)
    assert inspect.isgenerator(stage), "parse(...) should return a generator"
    assert list(stage) == [
        module.Request(datetime(2026, 9, 28, 9, 15, 2, tzinfo=UTC), "GET", "/products/wool-socks", 200, 5120, 38)
    ]
    assert rejects == Counter({"field count": 2, "timestamp": 1, "number": 1}), f"Wrong rejects: {rejects}"

    from itertools import islice

    list(islice(module.parse(module.generate_log(1000), Counter()), 2))
    assert module.METRICS.get("parse", {}).get("items") == 2, (
        'After taking two items from parse(...), METRICS["parse"]["items"] should be 2: decorate parse with '
        '@instrumented("parse", METRICS)'
    )


def test_pages_drops_static_files_and_health_checks():
    module = etl()
    paths = ["/", "/static/app.js", "/products", "/health", "/static/site.css", "/api/stock", "/search"]
    kept = [r.path for r in module.pages(iter([request("2026-09-28T09:00:00+00:00", path) for path in paths]))]
    assert kept == ["/", "/products", "/api/stock", "/search"]


def test_hourly_yields_one_hourstats_per_hour():
    module = etl()
    times = [12, 30, 7, 55, 21, 18, 90, 40, 33, 25]
    requests = [
        request(f"2026-09-28T09:{minute:02d}:00+00:00", status=500 if i in (2, 5) else 200, size=1000 + i, ms=ms)
        for i, (minute, ms) in enumerate(zip(range(0, 60, 6), times))
    ] + [request("2026-09-28T10:30:00+00:00", status=502, size=7, ms=64)]
    stats = list(module.hourly(iter(requests)))
    assert stats == [
        module.HourStats(datetime(2026, 9, 28, 9, tzinfo=UTC), 10, 2, 0.2, 74, 10045),
        module.HourStats(datetime(2026, 9, 28, 10, tzinfo=UTC), 1, 1, 1.0, 64, 7),
    ], "p95_ms uses statistics.quantiles(times, n=20, method='inclusive')[18], and an hour of one request uses its time"
    rates = list(module.hourly(iter([request("2026-09-28T11:00:00+00:00", status=s) for s in [500, 200, 200]])))
    assert rates[0].error_rate == 0.3333, "error_rate is errors / requests rounded to 4 places"


def test_hourly_yields_an_hour_as_soon_as_the_next_one_starts():
    def source():
        yield request("2026-09-28T09:00:00+00:00")
        yield request("2026-09-28T09:59:59+00:00")
        yield request("2026-09-28T10:00:00+00:00")
        raise AssertionError("hourly read past the first request of the next hour before yielding the hour")

    first = next(etl().hourly(source()))
    assert (first.hour, first.requests) == (datetime(2026, 9, 28, 9, tzinfo=UTC), 2)


def test_the_pipeline_is_lazy_on_a_billion_lines():
    assert PROGRAM.exists(), "etl.py should be at the top of your repository"
    code = (
        "import collections, etl\n"
        "first = next(etl.hourly(etl.pages(etl.parse(etl.generate_log(10**9), collections.Counter()))))\n"
        "print(first.hour.isoformat(), first.requests)\n"
    )
    try:
        result = subprocess.run([sys.executable, "-c", code], capture_output=True, text=True, timeout=30)
    except subprocess.TimeoutExpired:
        pytest.fail("The first HourStats from a pipeline over generate_log(10**9) took over 30 seconds: some stage isn't lazy")
    assert result.returncode == 0, f"The pipeline over generate_log(10**9) failed:\n{result.stderr[-1500:]}"
    assert result.stdout.split() == ["2026-09-28T00:00:00+00:00", "10464"]


def test_write_csv_writes_each_row_and_passes_it_on(tmp_path):
    module = etl()
    rows = [
        module.HourStats(datetime(2026, 9, 28, 9, tzinfo=UTC), 120, 3, 0.025, 88, 51234),
        module.HourStats(datetime(2026, 9, 28, 10, tzinfo=UTC), 7, 0, 0.0, 41, 999),
    ]
    path = tmp_path / "out.csv"
    stage = module.write_csv(iter(rows), str(path))
    assert not path.exists(), "write_csv should do nothing until the first row is asked for: it's a generator"
    passed_on = list(stage)
    assert passed_on == rows and all(a is b for a, b in zip(passed_on, rows)), "write_csv should yield each row unchanged"
    assert path.read_text(encoding="utf-8").splitlines() == [
        "hour,requests,errors,error_rate,p95_ms,bytes",
        "2026-09-28T09:00:00+00:00,120,3,0.0250,88,51234",
        "2026-09-28T10:00:00+00:00,7,0,0.0000,41,999",
    ]


def test_instrumented_counts_items_and_times_each_next():
    module = etl()
    now = [0.0]
    metrics = {}

    @module.instrumented("double", metrics, clock=lambda: now[0])
    def double(numbers):
        """Double each number."""
        for n in numbers:
            now[0] += 1.5  # each item takes 1.5 "seconds" to produce
            yield n * 2

    @module.instrumented("source", metrics, clock=lambda: now[0])
    def source():
        yield from [1, 2, 3]

    stage = double(source())
    assert list(metrics) == ["source", "double"], "metrics[name] should be set when a stage is called, source first"
    assert metrics["double"] == {"items": 0, "seconds": 0.0}
    assert inspect.isgenerator(stage), "A decorated stage should still return a generator"
    got = []
    for item in stage:
        got.append(item)
        now[0] += 100  # time spent by the consumer between next() calls doesn't count
    assert got == [2, 4, 6]
    assert metrics["double"]["items"] == 3 and metrics["source"]["items"] == 3
    assert metrics["double"]["seconds"] == pytest.approx(4.5), (
        f"seconds should add up the time each next() took (3 x 1.5), not the consumer's time: got {metrics['double']['seconds']}"
    )
    assert (double.__name__, double.__doc__) == ("double", "Double each number."), "Use functools.wraps"


def test_instrumented_stages_stay_lazy_and_close_their_input():
    module = etl()
    pulled, closed = [], []

    @module.instrumented("numbers", {})
    def numbers():
        try:
            for n in range(1000):
                pulled.append(n)
                yield n
        finally:
            closed.append(True)

    stage = numbers()
    assert pulled == [], "Calling a decorated stage shouldn't run it yet"
    assert next(stage) == 0 and next(stage) == 1
    assert pulled == [0, 1], "Each next() should pull exactly one item from the stage"
    stage.close()
    assert closed == [True], "Closing a decorated stage should close the stage's own generator"


def test_retry_backs_off_and_re_raises_the_last_error():
    module = etl()
    waits, calls = [], []
    error = ConnectionError("dropped")

    @module.retry(times=4, sleep=waits.append)
    def always_fails():
        """Never works."""
        calls.append(1)
        raise error

    with pytest.raises(ConnectionError) as caught:
        always_fails()
    assert caught.value is error, "retry should re-raise the original exception"
    assert len(calls) == 4 and waits == [0.5, 1.0, 2.0], f"4 attempts, waiting 0.5, 1.0, 2.0: got waits {waits}"
    assert always_fails.__name__ == "always_fails", "Use functools.wraps"

    waits.clear()
    attempts = iter([TimeoutError(), "ok"])

    @module.retry(delay=1, sleep=waits.append)
    def flaky():
        outcome = next(attempts)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    assert flaky() == "ok" and waits == [1]

    @module.retry(sleep=waits.append)
    def broken():
        raise ValueError("not a connection problem")

    waits.clear()
    with pytest.raises(ValueError):
        broken()
    assert waits == [], "Exceptions that aren't in `exceptions` should be raised at once, without a retry"


def test_load_sends_batches_and_retries():
    module = etl()
    rows = list(range(30))
    warehouse = module.FakeWarehouse()
    waits = []
    assert module.load(iter(rows), warehouse, sleep=waits.append) == 30
    assert warehouse.rows == rows and warehouse.calls == 4, "30 rows go in batches of 12, 12 and 6, with one retry"
    assert waits == [0.5]

    class Down:
        def send_batch(self, batch):
            raise ConnectionError("warehouse down")

    waits.clear()
    with pytest.raises(ConnectionError):
        module.load(iter(rows), Down(), sleep=waits.append)
    assert waits == [0.5, 1.0, 2.0], f"load should try each batch 4 times before giving up: waits were {waits}"


def test_run_report_prints_the_report_however_the_block_ends():
    module = etl()
    metrics = {"parse": {"items": 1234, "seconds": 1.234}, "csv": {"items": 5, "seconds": 2.0}}
    out = []
    clock = fake_clock(10.0, 12.5)
    with module.run_report(metrics, Counter({"number": 2, "field count": 3}), "a test", clock=clock, out=out.append):
        out.append("(the block)")
    assert out[:5] == ["Streaming ETL: a test", "", "(the block)", "", "Stage          Items   Seconds"]
    assert out[5:8] == [
        "parse          1,234      1.23",
        "csv                5      2.00",
        "Rejected: 5 lines (field count 3, number 2)",
    ]
    assert re.fullmatch(r"Finished in 2\.50*s", out[8]), f"Expected 'Finished in 2.5s', got {out[8]!r}"

    out.clear()
    with pytest.raises(RuntimeError, match="boom"):
        with module.run_report({}, Counter(), "a failing test", clock=fake_clock(20.0, 21.0), out=out.append):
            raise RuntimeError("boom")
    assert "Rejected: 0 lines" in out, "With no rejects, print 'Rejected: 0 lines' and nothing in brackets"
    assert re.fullmatch(r"Failed after 1\.00*s: RuntimeError: boom", out[-1]), (
        f"When the block raises, the report should end with 'Failed after <seconds>s: RuntimeError: boom', got {out[-1:]}"
    )


def test_read_log_and_a_real_log_file(tmp_path):
    module = etl()
    path = tmp_path / "three.log"
    path.write_text("first line\nsecond line\nthird\n", encoding="utf-8")
    assert list(module.read_log(str(path))) == ["first line", "second line", "third"]
    missing = module.read_log(str(tmp_path / "missing.log"))
    with pytest.raises(FileNotFoundError):
        next(missing)  # nothing should be opened until the first line is asked for

    log = tmp_path / "access.log"
    log.write_text("\n".join(module.generate_log(20_000)) + "\n", encoding="utf-8")
    generated, from_file = run(tmp_path, "--generate", "20000"), run(tmp_path, str(log))
    assert from_file.returncode == 0, f"python etl.py {log.name} crashed:\n{from_file.stderr[-1500:]}"
    assert f"Streaming ETL: {log}" in from_file.stdout
    assert counts(from_file.stdout)[1:] == counts(generated.stdout)[1:], (
        "A file of the first 20,000 generated lines should give the same counts as --generate 20000"
    )
