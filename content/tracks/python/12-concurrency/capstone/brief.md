Kiln & Co sells coffee, brewing kit and cups online, and a price-comparison partner wants a copy of
the whole catalogue every morning. The catalogue API has no "export everything" endpoint: you start
at `/`, and every page links to more pages. Fetching them one at a time takes minutes. Fetching
them all at once gets you `429 Too Many Requests` and, eventually, a blocked API key. And the API
has bad days: some pages fail and then work, some never work, and now and then one simply hangs.

You'll build `fetcher.py`, a crawler that is **fast** (several requests in flight), **polite** (a
concurrency cap and a rate limit it never breaks), and **reliable** (timeouts, retries with
backoff, and failures recorded rather than fatal). It uses nearly everything in this module:
tasks, a queue of workers, a throttle, `asyncio.timeout`, cancellation and clean shutdown.

Build it in your own editor and run it locally. The starter contains `MockCatalogueAPI`, a fake
async client that behaves like the real API, including its bad days, plus the dataclasses and a
`main()` that prints the report below once your crawler works.

## A sample run

```text
$ python fetcher.py
Pages fetched     33
Failed             2
Requests          42   (7 retries)
Peak in flight     4
Rate limited       0
Elapsed          2.9 s

Failures
  /p/discontinued-grinder    404 Not Found
  /p/hand-grinder            503 Service Unavailable after 4 attempts

Products (25), most expensive first
  COPPER-KETTLE          Copper gooseneck kettle            72.50
  CHEMEX-6-CUP           Chemex, 6 cup                      46.00
  SCALE-TIMER            Brewing scale with timer           39.90
  PAN-GEISHA-250         Panama Geisha, 250 g               39.00
  AEROPRESS              AeroPress                          34.99
  ... and 20 more
```

Every number except the elapsed time is exact: if yours differ, your crawler visits different
pages or retries differently from the rules below. `Peak in flight` and `Rate limited` come from the
mock's own `stats`, so they report what the API saw, not what your code thinks it did.

## The mock API

`MockCatalogueAPI` is a stand-in for an `httpx.AsyncClient`. `await client.get(path)` returns a
`Response` with a `status`, `headers` and a `json()` method. A page's JSON looks like this:

```json
{"title": "Copper gooseneck kettle",
 "links": ["/c/brewing", "/p/scale-timer", "/p/french-press-8"],
 "product": {"sku": "COPPER-KETTLE", "name": "Copper gooseneck kettle", "price": "72.50"}}
```

`product` is `null` on the home page and category pages. Links can point back to pages you've
already seen (product pages link to their category and to related products), so the site is a
graph with cycles, not a tree.

Its rules, which your crawler must respect:

| Rule | What happens if you break it |
|------|------------------------------|
| At most 4 requests in flight | `429 Too Many Requests`, with `Retry-After: 0.5` |
| At most 20 request starts in any one-second window | `429`, with `Retry-After: 0.5` |

And its bad days, which your crawler must survive: a couple of pages answer `503` once or twice
before they work, `/p/hand-grinder` answers `503` every time, `/p/discontinued-grinder` is linked
but gone (`404`), and `/p/copper-kettle` hangs for 30 seconds the first time it's requested.

Don't change the mock. The review runs your crawler against the original.

## The design

| Piece | Kind | Job |
|-------|------|-----|
| `Page` | frozen dataclass (in the starter) | One fetched page: path, title, links, product |
| `CrawlReport` | dataclass (in the starter) | Pages, failures, request and retry counts, elapsed time |
| `Throttle` | class | Holds request starts to `per_second` in any one-second window |
| `FetchFailed` | exception (in the starter) | A page that can't be fetched, with the reason as its message |
| `fetch_page` | coroutine | One page, with a time limit, retries and backoff |
| `crawl` | coroutine | The queue, the workers, the seen set and the report |
| `format_report` | function | The report text |

The work splits cleanly. `fetch_page` knows everything about one request and nothing about the
crawl; `crawl` knows the crawl and nothing about HTTP status codes. That's also what makes each one
testable on its own.

## Requirements

### Throttle

`Throttle(per_second)` has one coroutine method, `wait()`, which returns when the caller may start
a request, so that no more than `per_second` requests start in any one-second window. This is the
sliding-window throttle from lesson 4, with a period of one second. Use the loop's clock,
`asyncio.get_running_loop().time()`.

### fetch_page

`fetch_page(client, path, *, throttle, report, retries, timeout, backoff, rng)` makes up to
`retries + 1` attempts. For **every** attempt:

1. `await throttle.wait()`, then add 1 to `report.requests`. Every attempt after the first also
   adds 1 to `report.retries`.
2. Await `client.get(path)` inside `async with asyncio.timeout(timeout):`.
3. Then, depending on what came back:

| Outcome | What to do |
|---------|------------|
| `200` | Return a `Page` built from the JSON, with `links` as a tuple |
| `429` | Sleep for the `Retry-After` header's number of seconds, then try again |
| another `4xx` | Raise `FetchFailed("404 Not Found")` straight away: retrying won't help |
| a `5xx`, or `TimeoutError` | Sleep `backoff * 2 ** (attempt - 1) + rng.uniform(0, backoff)`, then try again |

When the last attempt fails, raise `FetchFailed` with the last problem and the number of attempts:
`"503 Service Unavailable after 4 attempts"`, or `"timed out after 4 attempts"`. Don't sleep after
the last attempt. `http.HTTPStatus(503).phrase` gives you `"Service Unavailable"`.

### crawl

`crawl(client, start="/", *, concurrency=4, per_second=15, retries=3, timeout=0.5, backoff=0.1,
max_pages=200, rng=None)` returns a `CrawlReport`:

- It uses an `asyncio.Queue` of paths and **exactly `concurrency` worker tasks**. Each worker takes
  a path, fetches it, and queues every link it hasn't seen before. Because there are only
  `concurrency` workers, there are never more than `concurrency` requests in flight.
- Each path is fetched at most once. A `seen` set, updated when a link is *queued* rather than when
  it's fetched, stops two workers from queuing the same page. No more than `max_pages` paths are
  ever queued.
- A fetched page goes in `report.pages`; a `FetchFailed` goes in `report.failures` as
  `{path: str(error)}`. Nothing a single page does stops the crawl.
- It ends when every queued path has been handled, then cancels the workers **and awaits them**,
  so nothing is left running when it returns. That must also happen if `crawl` itself is
  cancelled, so put the shutdown in a `finally:` block.
- It sets `report.elapsed` to the loop time the whole crawl took. `rng` defaults to a fresh
  `random.Random()`.

### The report

`format_report(report, client_stats)` returns the text in the sample run as one string, lines
joined with `\n`:

- Six summary lines. Each label is left-aligned in 16 characters, followed by the number
  right-aligned in 4. The requests line adds `   (7 retries)` and the elapsed line adds ` s`, with
  the time to one decimal. `Peak in flight` is `client_stats["peak_in_flight"]` and `Rate limited`
  is `client_stats["429"]`.
- A blank line, `Failures`, then one line per failure sorted by path: two spaces, the path
  left-aligned in 26, a space, then the reason.
- A blank line, `Products (25), most expensive first`, then the five most expensive products
  (ties broken by SKU): two spaces, the SKU left-aligned in 22, a space, the name left-aligned in 32,
  a space, and the price right-aligned in 7 with two decimals. Then `  ... and 20 more`.

## Getting started

1. Copy the starter into `fetcher.py`. Try the mock in the REPL first:
   `python -m asyncio`, then `client = MockCatalogueAPI()`, `r = await client.get("/")`,
   `r.status, r.json()`. Look at `client.stats`.
2. Write `Throttle` and check it: 30 calls to `wait()` from `asyncio.gather` with `per_second=10`
   should take about 2 seconds.
3. Write `fetch_page` with no retries at all (one attempt), and `crawl` with a single worker. Get a
   first report, with failures for everything that didn't answer 200.
4. Add the retry rules to `fetch_page`, one row of the table at a time. `/p/eth-yirgacheffe-1kg`
   should now work on its third attempt, and `/p/copper-kettle` on its second.
5. Raise the workers to `concurrency`, and check `client.stats["peak_in_flight"]` never goes above
   it. Then write `format_report` and compare the output with the sample, line by line.

### Things the lessons didn't cover

- **Retry-After** is a header with a number of seconds (it can also be an HTTP date; the mock only
  sends seconds). `float(response.headers["Retry-After"])` is enough here.
- **Jitter** is the random part of a backoff. Without it, every client that failed at the same
  moment retries at the same moment too, and fails again together. Taking the randomness from an
  injected `random.Random` makes the jitter reproducible in tests: pass `random.Random(7)` and every
  run sleeps for exactly the same times.
- **Knowing when a crawl is done.** The queue is empty for a moment every time a worker is busy
  fetching the only remaining page, so "the queue is empty" isn't the end. `queue.task_done()` after
  each path, whatever happened to it, and `await queue.join()` in `crawl`, is: `join()` returns only
  when every path ever queued has been marked done, and new links are queued before the page that
  linked to them is marked done.
- **Why the seen set needs no lock.** A worker checks `link not in seen` and does `seen.add(link)`
  with no `await` in between, so no other worker can run in the gap (lesson 7). Say so in a comment:
  the next person to touch the code will wonder.

## Try these

Before you submit, check each of these against a fresh `MockCatalogueAPI()`:

- The default run matches the sample, and `client.stats["429"]` is `0`.
- `crawl(client, concurrency=1)` gives the same 33 pages and 2 failures, just more slowly.
- `crawl(client, concurrency=8)` against the default mock (which allows 4) gets rate limited: the
  mock's `stats["429"]` is above zero. Your crawler should wait for `Retry-After` and retry. The
  requests and retry counts go up, and some pages may even run out of attempts; nothing crashes.
- `crawl(client, per_second=5)` takes at least 8 seconds, and the mock never sees more than 5
  starts in a second.
- `crawl(client, retries=0)` fails five pages: the three flaky ones, the kettle (`timed out after
  1 attempts`) and the 404. With `retries=0` there's never a sleep.
- `crawl(client, max_pages=10)` returns at most 10 pages and failures between them.
- Cancel a crawl halfway: `task = asyncio.create_task(crawl(client))`, `await asyncio.sleep(0.5)`,
  `task.cancel()`. After awaiting it, `len(asyncio.all_tasks())` is back to 1 (just the REPL's own
  task), because no worker was left behind.

## Stretch goals

Pick any you like once the requirements work:

- **Crawl the real web.** Write an `HttpxClient` adapter with the same `async def get(path)`
  interface, built on one shared `httpx.AsyncClient(base_url=...)` (module 14 covers httpx
  properly). Point it at `https://books.toscrape.com/`, a site built for people practising
  scraping. Its pages are HTML, not JSON, so the adapter converts each one into the same
  `{"title", "links", "product"}` shape, collecting `<a href>` links with the standard library's
  `html.parser.HTMLParser`, keeping only links on the same site, and turning relative URLs into
  paths with `urllib.parse.urljoin`. Send a `User-Agent` that says who you are, keep `concurrency`
  at 2 or 3 and `per_second` at 2, and set `max_pages` to 50. Nothing in `crawl` should need to
  change, which is the proof that the design is right.
- **Respect robots.txt.** Fetch `/robots.txt` first and skip disallowed paths, using
  `urllib.robotparser`.
- **Progress.** Print one line per page as it finishes (`[12/33] /p/aeropress 200 in 31 ms`) from
  the workers, without changing the final report.
- **A command-line interface.** `python fetcher.py --concurrency 2 --per-second 5 --retries 1`,
  with `argparse` (module 10).
- **Tests.** Write `test_fetcher.py` with pytest (module 7) and `pytest-asyncio`, or with
  `asyncio.run` inside plain tests. Use small fake clients like the ones in this module's drills to
  check the retry rules one at a time: a client that answers `503, 503, 200` is retried twice, one
  that answers `404` is tried once, and one that sleeps longer than `timeout` times out.
- **Resume.** Save the report as JSON when the crawl is cancelled with Ctrl+C, and add a `--resume`
  option that skips pages already fetched.

## How to submit

Push `fetcher.py` and a short `README.md` (what it does, how to run it, and one paragraph on why it
can't overload the API) to a GitHub repository, and submit its link on this capstone's page. The
review runs `python fetcher.py` and compares the counts with the sample, runs hidden checks against
fresh mocks with different limits, including cancelling a crawl halfway, then reads your code
against the criteria: one place for each limit, the retry rules exactly as written, no blocking
calls or forgotten awaits, and nothing left running when `crawl` returns.
