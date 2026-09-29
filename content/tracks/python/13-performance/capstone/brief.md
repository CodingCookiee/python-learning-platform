Harbour & Hull Coffee roasts beans and sells them online across Europe. Every quarter, the
operations lead runs `report.py` to produce the quarterly order report: revenue by region, best
sellers, returning customers, shipping speed, and a day-by-day table. It's correct, and finance
trusts it. It also takes around half a minute for one quarter's sample, and now finance
wants it on demand, for every quarter, and for a business that's doubling its orders every year.

Your job is to make `build_report` **at least 20 times faster** without changing a single
character of what it prints, and to prove both with measurements. This is the whole module in one
project: measure, profile, find the hot spots, fix them with the right data structure or technique,
and measure again.

Build it in your own editor, with a normal CPython (3.12 or later). The starter is `report.py`; it
contains the report, the helpers it uses, and a `make_sample` function that generates a realistic,
repeatable quarter of data.

## A sample run

```text
$ python report.py --time
build_report: best of 1: 29.398 s
Harbour & Hull Coffee: quarterly order report
01 Jul 2026 to 30 Sep 2026

Orders          5,000
Revenue    648,323.55 GBP including VAT
Average        129.66 GBP per order

Revenue by region, excluding VAT
  Nordics               135,511.60
  Central Europe        115,940.60
  ...

Top 10 products by revenue
   1. HH-1274  Guatemala Antigua, 1 kg, lot 54           1,438.40
   ...

Customers
  Ordered at least once    2,570
  Ordered again            1,100  (42.8%)

Business days from order to dispatch, by carrier
  Parcelwise          3.36   (1,736 orders)
  ...

Orders with a discontinued product: 1,584

Revenue by day
  Wed 01 Jul    62 orders      7,134.35
  ...
```

The timing line goes to stderr, so it never mixes with the report. Your time will differ: what
matters is the ratio between the starter and your version on **your** machine. When you're done,
the same command should print something like `best of 1: 1.2 s` or better. (A careful solution
gets well past 100 times faster.)

## The rules

1. **Correctness comes first.** `build_report` must return exactly the same text as the starter's,
   for any number of orders and any seed, not only the default sample. A faster report with one
   wrong number is a slower report, because now someone has to find the bug.
2. **All the work stays inside `build_report`**, starting from the raw data `make_sample` returns.
   Don't change `make_sample`, `main` or the command-line flags, and don't move work into them.
3. **Nothing is carried over from one call to the next.** A cache that lives for one call of
   `build_report` is fine. A module-level `@cache` that's still full on the second call makes
   `--repeat` timings meaningless, so create the cache inside `build_report`, or clear it at the
   start.
4. **Standard library only.** No numpy or pandas: the point is to fix the Python.
5. **Measure the same way every time**: the default sample, `python report.py --time`, on the same
   machine, with nothing heavy running alongside. For the fast version, use `--time --repeat 5`
   and quote the best run.

## How to work

### 1. Save the answer before you touch anything

Save the starter's output. It's the reference your version must match exactly:

```bash
python report.py > expected.txt
python report.py --orders 1000 > expected-1000.txt
```

Then write `test_report.py` (module 7). At minimum it builds the report for the default sample and
compares it with `expected.txt`, and for the 1 000-order sample with `expected-1000.txt`, which is
the one you'll run constantly because it takes a few seconds rather than half a minute. Keep a
copy of the original `report.py` as `report_original.py`, so the tests can also compare your
rewritten helpers against the originals, for example your fast date handling against the original
`parse_day` on every date in the sample.

### 2. Measure and profile the starter

```bash
python report.py --time > /dev/null
python -m cProfile -o before.prof report.py > /dev/null
python -c "import pstats; pstats.Stats('before.prof').sort_stats('tottime').print_stats(12)" > before-profile.txt
```

(On Windows, write `NUL` instead of `/dev/null`.) Read `before-profile.txt` the way lesson 2 taught
you. Which function has the biggest `tottime`? Which has a surprising `ncalls`? Which part of
`build_report` does each one come from? Sorting by `cumulative` as well helps you see which
section of the report the time goes through.

Profiling makes this program much slower than half a minute, because it makes millions of small calls
and cProfile records every one. That's expected. Use the profile to find where the time goes, and
`--time` for the numbers you report.

### 3. Fix the biggest hot spot, check, measure, repeat

For each change:

1. Fix the function (or section) at the top of the profile.
2. Run `test_report.py`. If the output changed, undo and think again.
3. Time it with `--time`, and write the change and the new time in `NOTES.md`.
4. Profile again. The hot spot has moved, and the next one might be somewhere you didn't expect.

Stop when you're past 20 times faster and the next fix would make the code harder to read for a
small gain. The profile will tell you when you've reached that point.

### Things the lessons didn't cover

- **Parsing dates.** `datetime.strptime` is very general and correspondingly slow: it works out
  what the format string means on every single call. For ISO dates like `"2026-07-01"`,
  `date.fromisoformat` does the same job many times faster. ISO date strings also sort and compare
  in date order as plain strings, and they make perfectly good dict keys.
- **Counting.** `collections.Counter` counts and groups in one pass. `Counter(ids)` tells you how
  many times each id appears, which answers "seen at least once" and "seen more than once" together.
- **Top N.** `sorted(...)[:10]` sorts once. `heapq.nlargest(10, ...)` is even cheaper, but check it
  breaks ties the way the original does.
- **Comparing big text.** When a test says two 400-line strings differ, `difflib.unified_diff`
  (or `diff expected.txt actual.txt`) shows you the line.

## What to hand in

Push a GitHub repository containing:

- `report.py`: your fast version, with the same `make_sample`, `main` and flags.
- `report_original.py`, `expected.txt` and `expected-1000.txt`: the starter and its outputs.
- `test_report.py`: the output comparison and helper checks described above. `pytest` must pass.
- `before-profile.txt` and `after-profile.txt`: the top 12 functions by `tottime` for the starter
  and for your final version, produced with the commands above.
- `NOTES.md`: a table of your changes in the order you made them, with the `build_report` time after
  each, then the final speed-up (starter time divided by your best time) and the machine you
  measured on. One or two sentences per change: what the profile showed, what you changed, and
  why that fix fits the problem.

Submit the repository's link on this capstone's page. The review re-runs your timings on the same
machine against the starter, runs your tests plus hidden ones (other sample sizes and seeds must
still match the original exactly), and reads your notes and profiles against the criteria.

## Stretch goals

- **100 times faster.** It's possible with nothing but the standard library. Where's the time in
  your `after-profile.txt` now, and is any of it still yours?
- **Scale test.** Time your version with `--orders 5000`, `--orders 10000` and `--orders 20000`.
  Doubling the orders should roughly double the time. If it more than doubles, something is still
  worse than linear: find it.
- **Memory.** Measure the peak memory of `build_report` with `tracemalloc` (lesson 5), before and
  after. Did your speed-ups cost memory? Is that a good trade here?
- **Keep the originals honest.** Use `random.Random` to generate a few hundred small random
  samples with different seeds (`make_sample(50, seed=n)`) and check your version agrees with
  `report_original.py` on every one. Did any edge case, such as a day with no orders, catch you out?
