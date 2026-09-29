Harbour Lane Outfitters sells outdoor clothing online, and its web servers write about 30 million
access-log lines a day. Every night a script turns the log into hourly traffic stats for the
analytics warehouse: requests, server errors, the 95th-percentile response time and bytes sent.
The script starts with `lines = open(path).readlines()`. It worked for two years. Since the
autumn sale it runs out of memory at 3 a.m. about twice a week, and the dashboards show a gap.

Your job is to rebuild it as a **streaming ETL** (extract, transform, load) pipeline: a chain of
generators that pulls one line at a time from the log, through every stage, into a CSV file and
the warehouse, so memory stays flat however large the log gets. You'll instrument it with your own
decorators, so the ops team can see how many records each stage handled and where the time went,
and so a dropped warehouse connection is retried instead of killing the run.

You'll build one module, `etl.py`, in your own editor. The starter contains the test data (a log
generator that can produce any number of lines without storing them), a fake warehouse that drops
its connection now and then, the two record dataclasses, and a `main()` that wires everything
together once your pieces work.

## A sample run

```text
$ python etl.py --generate 200000
Streaming ETL: 200,000 generated lines (seed 8)

Loaded 14 hours into the warehouse: 2 batches, 1 retried

Stage          Items   Seconds
parse        199,208      1.12
pages        145,184      1.25
hourly            14      1.37
csv               14      1.37
Rejected: 792 lines (field count 404, timestamp 199, number 189)
Finished in 1.9s
Peak memory: 0.4 MB
```

Every **count** in that output must match yours exactly: they come from a seeded generator, so
they're the same on every machine. The seconds and the peak memory will differ, but the memory
must stay roughly the same when you run a log five times the size (see "Try these").

`hourly.csv` starts like this:

```text
hour,requests,errors,error_rate,p95_ms,bytes
2026-09-28T00:00:00+00:00,HOUR0_REQUESTS,HOUR0_ERRORS,HOUR0_RATE,HOUR0_P95,HOUR0_BYTES
```

## The design

```text
generate_log / read_log → parse → pages → hourly → write_csv → load → warehouse
      lines               Request   Request  HourStats  HourStats    batches of 12
```

Each arrow is an iterator. Nothing happens until `load` asks `write_csv` for a row, which asks
`hourly`, which asks `pages`, and so on back to the log. One line travels the whole way before
the next is read. `hourly` is the only stage that keeps anything, and only one hour's response
times, because it needs them for the percentile.

| Piece | Kind | Job |
|-------|------|-----|
| `Request`, `HourStats` | frozen dataclasses (in the starter) | One parsed log line; one hour of stats |
| `read_log(path)` | generator | The lines of a file, one at a time, without line endings |
| `parse(lines, rejects)` | generator | `Request` records, counting the lines it rejects |
| `pages(requests)` | generator | Drops static files and health checks |
| `hourly(requests)` | generator | One `HourStats` per hour, as each hour ends |
| `write_csv(rows, path)` | generator | Writes each row to a CSV file and passes it on |
| `load(rows, client)` | function | Sends batches to the warehouse, with retries |
| `instrumented(name, metrics)` | decorator factory | Counts and times a generator stage |
| `retry(...)` | decorator factory | Retries on dropped connections, with backoff |
| `run_report(...)` | `@contextmanager` | Prints the header, and the report however the run ends |

## Requirements

### The log

A line has six fields separated by spaces:

```text
2026-09-28T09:15:02Z GET /products/wool-socks 200 5120 38
```

The timestamp (UTC), method, path, status, bytes sent and milliseconds taken. The lines are in
time order. `generate_log(count)` produces them for testing; about 1 line in 250 is damaged on
purpose, in one of three ways that `parse` has to survive.

### Stages

- **`read_log(path)`** opens the file with UTF-8 and yields each line without its trailing newline.
  The file must be closed when the lines run out, or when the generator is closed early, so open it
  with `with` inside the generator.
- **`parse(lines, rejects)`** yields a `Request` for every good line. `rejects` is a `Counter`;
  every bad line adds one to exactly one reason and is skipped, checked in this order:
  - `"field count"`: the line doesn't split into exactly six fields,
  - `"timestamp"`: `datetime.fromisoformat` can't read the first field,
  - `"number"`: the status, bytes or milliseconds aren't whole numbers.
- **`pages(requests)`** drops requests whose path starts with `/static/` and requests for
  `/health`. Everything else passes through unchanged.
- **`hourly(requests)`** groups consecutive requests by the hour they fall in and yields an
  `HourStats(hour, requests, errors, error_rate, p95_ms, bytes)` for each: `hour` is the start of
  the hour (a timezone-aware `datetime`), `errors` counts statuses of 500 or more, `error_rate` is
  `errors / requests` rounded to 4 places, `p95_ms` is the 95th percentile of the hour's response
  times rounded to a whole number, and `bytes` is the total sent. An hour is yielded as soon as the
  first request of the next hour arrives.
- **`write_csv(rows, path)`** writes a header row, then one row per `HourStats` as it arrives,
  with the hour in ISO format and the error rate to 4 decimal places, and yields each `HourStats`
  on unchanged. The file is closed when the stream ends.
- **`load(rows, client, *, batch_size=12, sleep=time.sleep)`** sends the rows to
  `client.send_batch(list_of_rows)` in batches of `batch_size`, retrying each batch with your
  `retry` decorator (4 attempts), and returns how many rows it loaded.

None of these may call `list()`, `sorted()`, `readlines()` or anything else that collects the log
or the requests. (`hourly` collecting one hour's response times is the one exception.)

### Decorators

**`instrumented(name, metrics, clock=time.perf_counter)`** is a decorator factory for generator
functions. When a decorated stage is called, it sets `metrics[name] = {"items": 0, "seconds": 0.0}`
(so the dict lists the stages in pipeline order, source first), and returns a generator that:

- yields exactly what the stage yields, lazily, one item per `next()`,
- adds 1 to `"items"` for each item, and adds the time each `next()` took to `"seconds"`,
- closes the stage's generator if it's closed early itself.

The time is **inclusive**: a stage's `next()` also waits for every stage before it, which is why
the seconds in the sample grow down the table. The decorated stages keep their names and
docstrings. Decorate `parse`, `pages`, `hourly` and `write_csv` as `"parse"`, `"pages"`,
`"hourly"` and `"csv"`, all with the module's `METRICS` dict.

**`retry(times=3, *, exceptions=(ConnectionError, TimeoutError), delay=0.5, sleep=time.sleep)`**
is the decorator factory from lesson 6: up to `times` attempts, waiting `delay`, `2 * delay`,
`4 * delay`… between them by calling `sleep`, re-raising the last error if every attempt fails,
and raising anything else immediately. `load` builds its retrying sender by calling it directly:
`retry(times=4, sleep=sleep)(client.send_batch)`, which is the `@` line without the `@`.

**`run_report(metrics, rejects, description, *, clock=time.perf_counter, out=print)`** is a
`@contextmanager` that prints, through `out`:

1. on entry: `Streaming ETL: <description>` and a blank line;
2. on exit, **however the block ends**: a blank line, the stage table, the rejects line, then
   either `Finished in <seconds>s` or, if the block raised, `Failed after <seconds>s: <ExceptionType>: <message>`.
   A failure is then re-raised.

The table's header is `Stage` left-aligned in 8 characters, then `Items` and `Seconds`
right-aligned in 12 and 10; each row is the stage name, its items with thousands separators, and
its seconds to 2 places, in the same widths. The rejects line is `Rejected: 792 lines`, followed by
the reasons in brackets, most common first, or nothing in brackets when there were none.

## Getting started

1. Copy the starter into `etl.py`, and run `python etl.py --generate 1000` now and then as the
   pieces arrive. It fails in `main()` until `run_report` works; that's expected.
2. Write `parse` and `pages` first and try them in the REPL on a three-line list, then on
   `generate_log(2000)`: `Counter()` for the rejects, and `sum(1 for _ in ...)` to count what comes
   out without building a list.
3. Write `hourly` with `itertools.groupby`, then `write_csv`.
4. Write `run_report`, then `load` with `retry`. At this point `main()` runs end to end; check the
   counts against the sample.
5. Write `instrumented` last, and add it to the four stages. The counts mustn't change; the stage
   table fills in.

### Things the lessons didn't cover

- **The 95th percentile.** `statistics.quantiles(times, n=20, method="inclusive")` returns the 19
  cut points between twenty equal groups; the last one, index `[18]`, is the 95th percentile. It
  needs at least two values, so for an hour with a single request use that request's time.
- **Timestamps with a `Z`.** `datetime.fromisoformat("2026-09-28T09:15:02Z")` understands the `Z`
  and returns a UTC-aware datetime (Python 3.11 and later). `.replace(minute=0, second=0,
  microsecond=0)` is the start of its hour.
- **Writing CSV as you go.** Create `csv.writer(file)` once, inside a `with open(path, "w",
  newline="", encoding="utf-8")` in the generator, and call `writer.writerow([...])` for each row.
  Rows reach the disk as they're written, not at the end.
- **Batches.** `itertools.batched(rows, 12)` yields tuples of up to 12 rows, lazily.
- **Measuring memory.** The starter's `main()` uses `tracemalloc`, which records every allocation
  Python makes, so a run is noticeably slower under it. `get_traced_memory()` returns the current
  and peak bytes allocated since `tracemalloc.start()`.

## Try these

Before you submit, check each of these:

- `python etl.py --generate 1000000` (the default, so plain `python etl.py` does the same) reports
  ONE_M_COUNTS. Its peak memory is close to the 200,000-line run's, not five times it.
- In the REPL, `next(hourly(pages(parse(generate_log(10**9), Counter()))))` returns the first hour
  at once. A billion lines is about eight years of this shop's log.
- `list(parse(["garbage", "2026-13-28T09:00:00Z GET / 200 10 5", "2026-09-28T09:00:00Z GET / - 10 5"], rejects))`
  is empty, and `rejects` is `Counter({"field count": 1, "timestamp": 1, "number": 1})`.
- Take two items from `parse(...)` with `islice` and then look at `METRICS["parse"]`: it says 2.
- Make `pages` raise on its 1,000th request and run `main()`: the report is still printed, ends
  with `Failed after …: RuntimeError: …`, and the traceback follows it.
- Give `load` a client whose `send_batch` always raises `ConnectionError`, and a `sleep` that
  appends to a list: it re-raises after four attempts, and the list is `[0.5, 1.0, 2.0]`.
- Save 50,000 generated lines to a file (`"\n".join(...)` of `generate_log(50_000)` is fine for a
  test file this size) and run `python etl.py that-file.log`.

## Stretch goals

Pick any you like once the requirements work:

- **Exclusive time.** Make the stage table show the time spent in each stage *excluding* the
  stages upstream of it, so the slow stage stands out. (Hint: each stage's inclusive time minus the
  inclusive time of the stage it reads from.)
- **Sampled rejects.** Keep the first five rejected lines of each reason, with their line numbers,
  and print them under the report. The sample must stay bounded however many lines are bad.
- **Several files.** `python etl.py day1.log day2.log day3.log` reads them as one stream with
  `yield from`, and gzip-compressed logs (`.gz`) are read with `gzip.open(path, "rt")`.
- **Late lines.** Real logs occasionally have a line a few seconds out of order across an hour
  boundary. Decide what `hourly` should do about it, implement it, and explain the trade-off in your
  README.
- **Tests.** Write `test_etl.py` with pytest: each stage on a handful of lines, laziness checked
  with an endless generator and `islice`, `retry` with a fake `sleep`, and `run_report` with a fake
  clock and `out=lines.append`.

## How to submit

Push `etl.py` and a short `README.md` (what it does, how to run it, and the peak memory you
measured for 200,000 and 1,000,000 lines) to a GitHub repository, and submit its link on this
capstone's page. The review runs hidden tests against each stage and decorator, runs
`python etl.py --generate 200000` and compares the counts with the sample, then reads your code
against the criteria: lazy stages that never collect the log, decorators that keep functions
honest (names, laziness, re-raised errors), a report that survives failures, and stages small
enough to test on three lines.
