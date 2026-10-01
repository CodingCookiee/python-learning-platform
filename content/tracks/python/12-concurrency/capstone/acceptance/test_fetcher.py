"""Acceptance tests for the concurrent fetcher, run by GitHub Actions in your repository.

They import fetcher.py from the top of your repository and run your crawler against a fresh
copy of the original MockCatalogueAPI (below, unchanged from the starter), so the counts
can't depend on changes to the mock in your file. Each crawl has a time limit, so a crawl
that never finishes fails instead of hanging.
"""

import asyncio
import importlib
import json
import random
import re
import subprocess
import sys
from collections import deque
from dataclasses import dataclass, field
from pathlib import Path

import pytest

# ---------------------------------------------------------------------------
# The original mock API, exactly as in the starter
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Response:
    """What the client's get() returns, shaped like an httpx response."""

    status: int
    body: str = ""
    headers: dict = field(default_factory=dict)

    def json(self):
        return json.loads(self.body)


CATEGORIES = {
    "coffee": [
        ("eth-yirgacheffe-1kg", "Ethiopia Yirgacheffe, 1 kg", "28.40"),
        ("col-huila-1kg", "Colombia Huila, 1 kg", "23.60"),
        ("ken-nyeri-1kg", "Kenya Nyeri, 1 kg", "31.20"),
        ("gua-antigua-1kg", "Guatemala Antigua, 1 kg", "24.90"),
        ("bra-cerrado-1kg", "Brazil Cerrado, 1 kg", "19.80"),
        ("dec-swiss-water-250", "Swiss Water decaf, 250 g", "8.20"),
        ("esp-house-blend-1kg", "House espresso blend, 1 kg", "21.50"),
        ("pan-geisha-250", "Panama Geisha, 250 g", "39.00"),
        ("rwa-nyamasheke-1kg", "Rwanda Nyamasheke, 1 kg", "26.10"),
        ("sum-mandheling-1kg", "Sumatra Mandheling, 1 kg", "22.70"),
        ("cold-brew-pack", "Cold brew pack, 500 g", "12.40"),
        ("sample-box", "Tasting sample box", "15.00"),
    ],
    "brewing": [
        ("v60-dripper", "V60 ceramic dripper", "24.00"),
        ("v60-filters-100", "V60 paper filters, pack of 100", "4.70"),
        ("chemex-6-cup", "Chemex, 6 cup", "46.00"),
        ("aeropress", "AeroPress", "34.99"),
        ("hand-grinder", "Hand grinder", "89.00"),
        ("copper-kettle", "Copper gooseneck kettle", "72.50"),
        ("scale-timer", "Brewing scale with timer", "39.90"),
        ("french-press-8", "French press, 8 cup", "29.00"),
    ],
    "cups": [
        ("mug-stoneware", "Stoneware mug", "11.20"),
        ("cup-espresso-pair", "Espresso cups, pair", "18.00"),
        ("mug-travel", "Insulated travel mug", "22.00"),
        ("cup-cortado", "Cortado glass", "7.50"),
        ("mug-enamel", "Enamel camping mug", "9.90"),
        ("saucer-set", "Saucer set of 4", "16.00"),
    ],
}
PAGE_SIZE = 5


def _build_site():
    """Every path on the mock site and the JSON document it serves."""
    site = {"/": {"title": "Kiln & Co catalogue", "links": [f"/c/{name}" for name in CATEGORIES], "product": None}}
    for category, products in CATEGORIES.items():
        pages = [products[i:i + PAGE_SIZE] for i in range(0, len(products), PAGE_SIZE)]
        for number, page in enumerate(pages, start=1):
            path = f"/c/{category}" if number == 1 else f"/c/{category}?page={number}"
            links = [f"/p/{slug}" for slug, _, _ in page]
            if number < len(pages):
                links.append(f"/c/{category}?page={number + 1}")
            links.append("/")
            site[path] = {"title": f"{category.title()}, page {number}", "links": links, "product": None}
        for index, (slug, name, price) in enumerate(products):
            related = [products[(index + step) % len(products)][0] for step in (1, 2)]
            site[f"/p/{slug}"] = {
                "title": name,
                "links": [f"/c/{category}"] + [f"/p/{other}" for other in related],
                "product": {"sku": slug.upper(), "name": name, "price": price},
            }
    site["/c/brewing?page=2"]["links"].insert(0, "/p/discontinued-grinder")
    return site


class MockCatalogueAPI:
    """A fake async HTTP client for the Kiln & Co catalogue API.

    `await client.get(path)` returns a Response after 10 to 40 ms. Like the real API:

    - More than `max_in_flight` requests in flight at once get 429 Too Many Requests.
    - More than `max_per_second` requests started in any one-second window get 429 too.
      Every 429 carries a Retry-After header, in seconds.
    - Some pages fail with 503 Service Unavailable a few times before they work, and one
      of them never works. One linked page is gone (404). One page hangs the first time
      it's requested, and answers normally after that.

    `stats` counts everything, so you can check what your crawler did.
    """

    FLAKY = {"/p/eth-yirgacheffe-1kg": 2, "/c/cups?page=2": 1, "/p/hand-grinder": 99}
    HANGS_ONCE = {"/p/copper-kettle"}

    def __init__(self, *, max_in_flight=4, max_per_second=20, latency=(0.01, 0.04), seed=12):
        self.site = _build_site()
        self.max_in_flight = max_in_flight
        self.max_per_second = max_per_second
        self.latency = latency
        self._rng = random.Random(seed)
        self._failures_left = dict(self.FLAKY)
        self._hangs_left = set(self.HANGS_ONCE)
        self._recent_starts = deque()
        self._in_flight = 0
        self.stats = {"requests": 0, "ok": 0, "429": 0, "503": 0, "404": 0, "peak_in_flight": 0}

    async def get(self, path):
        loop = asyncio.get_running_loop()
        now = loop.time()
        self.stats["requests"] += 1
        while self._recent_starts and now - self._recent_starts[0] >= 1.0:
            self._recent_starts.popleft()
        self._recent_starts.append(now)
        self._in_flight += 1
        self.stats["peak_in_flight"] = max(self.stats["peak_in_flight"], self._in_flight)
        try:
            if self._in_flight > self.max_in_flight or len(self._recent_starts) > self.max_per_second:
                self.stats["429"] += 1
                await asyncio.sleep(0.005)
                return Response(429, '{"error": "slow down"}', {"Retry-After": "0.5"})
            if path in self._hangs_left:
                self._hangs_left.discard(path)
                await asyncio.sleep(30)
            await asyncio.sleep(self._rng.uniform(*self.latency))
            if self._failures_left.get(path, 0) > 0:
                self._failures_left[path] -= 1
                self.stats["503"] += 1
                return Response(503, '{"error": "upstream unavailable"}')
            if path not in self.site:
                self.stats["404"] += 1
                return Response(404, '{"error": "not found"}')
            self.stats["ok"] += 1
            return Response(200, json.dumps(self.site[path]), {"Content-Type": "application/json"})
        finally:
            self._in_flight -= 1


# ---------------------------------------------------------------------------
# The tests
# ---------------------------------------------------------------------------

PROGRAM = Path("fetcher.py")

SAMPLE_REPORT = """\
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
  ... and 20 more"""

SAMPLE_FAILURES = {
    "/p/discontinued-grinder": "404 Not Found",
    "/p/hand-grinder": "503 Service Unavailable after 4 attempts",
}


@pytest.fixture(scope="module")
def fetcher():
    assert PROGRAM.exists(), "fetcher.py should be at the top of your repository"
    return importlib.import_module("fetcher")


@pytest.fixture(scope="module")
def default_run(fetcher):
    """One crawl with the default settings against a fresh, original mock."""
    client = MockCatalogueAPI()
    report = asyncio.run(asyncio.wait_for(fetcher.crawl(client, rng=random.Random(7)), 60))
    return report, client


def crawl(fetcher, client, **options):
    """Run one crawl, with a time limit so a stuck crawl fails rather than hangs."""
    return asyncio.run(asyncio.wait_for(fetcher.crawl(client, rng=random.Random(7), **options), 60))


class EdgeRng:
    """A random.Random stand-in whose jitter is always the largest allowed."""

    def uniform(self, low, high):
        return high


class ScriptedClient:
    """Answers each get() with the next item: a status, a (status, headers) pair, or "hang"."""

    def __init__(self, *script):
        self.script = list(script)
        self.calls = 0

    async def get(self, path):
        step = self.script[min(self.calls, len(self.script) - 1)]
        self.calls += 1
        if step == "hang":
            await asyncio.sleep(5)
            step = 200
        status, headers = step if isinstance(step, tuple) else (step, {})
        await asyncio.sleep(0.001)
        body = json.dumps({"title": "T", "links": ["/a", "/b"], "product": None}) if status == 200 else "{}"
        return Response(status, body, headers)


def fetch(fetcher, client, *, retries=3, timeout=1.0, backoff=0.01, rng=None):
    """Run fetch_page once. Returns (page or the FetchFailed, report, seconds taken)."""

    async def run():
        report = fetcher.CrawlReport()
        loop = asyncio.get_running_loop()
        began = loop.time()
        try:
            outcome = await fetcher.fetch_page(
                client, "/x", throttle=fetcher.Throttle(100), report=report, retries=retries,
                timeout=timeout, backoff=backoff, rng=rng or random.Random(1),
            )
        except fetcher.FetchFailed as error:
            outcome = error
        return outcome, report, loop.time() - began

    return asyncio.run(asyncio.wait_for(run(), 30))


def test_the_default_crawl_matches_the_sample_counts(default_run):
    report, client = default_run
    assert len(report.pages) == 33, f"Expected 33 pages fetched, got {len(report.pages)}"
    assert report.failures == SAMPLE_FAILURES
    assert (report.requests, report.retries) == (42, 7), (
        f"Expected 42 requests with 7 retries, got {report.requests} with {report.retries}"
    )
    assert client.stats["peak_in_flight"] == 4, "With 4 workers, the mock should see 4 requests in flight at the peak"
    assert client.stats["429"] == 0, "The default crawl should never be rate limited"
    assert client.stats["requests"] == 42, "report.requests should count every request the API saw"
    page = report.pages["/"]
    assert page.title == "Kiln & Co catalogue" and page.links == ("/c/coffee", "/c/brewing", "/c/cups"), (
        "A Page should hold the title, and the links as a tuple"
    )


def test_format_report_prints_the_sample(fetcher, default_run):
    report, client = default_run
    report.elapsed = 2.94
    assert fetcher.format_report(report, client.stats) == SAMPLE_REPORT


def test_running_it_prints_the_sample_run():
    assert PROGRAM.exists(), "fetcher.py should be at the top of your repository"
    result = subprocess.run([sys.executable, str(PROGRAM)], capture_output=True, text=True, timeout=90)
    assert result.returncode == 0, f"python fetcher.py crashed:\n{result.stderr[-1500:]}"
    got = [line.rstrip() for line in result.stdout.strip().splitlines()]
    expected = SAMPLE_REPORT.splitlines()
    assert len(got) == len(expected), f"Expected {len(expected)} lines, got {len(got)}:\n{result.stdout}"
    assert re.fullmatch(r"Elapsed {6,}\d+\.\d s", got[5]), f"The elapsed line looks wrong: {got[5]!r}"
    assert got[:5] + got[6:] == expected[:5] + expected[6:]


def test_two_workers_never_exceed_two_requests_in_flight(fetcher):
    client = MockCatalogueAPI(max_in_flight=2)
    report = crawl(fetcher, client, concurrency=2)
    assert client.stats["peak_in_flight"] <= 2, f"concurrency=2 let {client.stats['peak_in_flight']} requests run at once"
    assert client.stats["429"] == 0
    assert len(report.pages) == 33 and report.failures == SAMPLE_FAILURES


def test_crawl_uses_exactly_concurrency_worker_tasks(fetcher):
    class Counting(MockCatalogueAPI):
        most = 0

        async def get(self, path):
            Counting.most = max(Counting.most, len(asyncio.all_tasks()))
            return await super().get(path)

    report = crawl(fetcher, Counting(), concurrency=3)
    assert len(report.pages) == 33
    assert Counting.most <= 4, (
        f"Saw {Counting.most} tasks running during a crawl with concurrency=3: expected the 3 workers "
        "and the task running crawl(), and no task per request"
    )


def test_the_rate_limit_is_never_broken(fetcher):
    client = MockCatalogueAPI(max_per_second=10)
    report = crawl(fetcher, client, per_second=10)
    assert client.stats["429"] == 0, (
        f"With per_second=10, the mock saw more than 10 starts in a second {client.stats['429']} times"
    )
    assert len(report.pages) == 33


def test_the_throttle_allows_per_second_starts_in_any_second(fetcher):
    async def run():
        throttle = fetcher.Throttle(10)
        loop = asyncio.get_running_loop()
        starts = []

        async def one():
            await throttle.wait()
            starts.append(loop.time())

        began = loop.time()
        await asyncio.gather(*(one() for _ in range(25)))
        return sorted(start - began for start in starts)

    starts = asyncio.run(asyncio.wait_for(run(), 30))
    assert len(starts) == 25
    busiest = max(sum(1 for later in starts if 0 <= later - start < 0.98) for start in starts)
    assert busiest <= 10, f"Throttle(10) let {busiest} requests start within one second"
    assert 1.9 <= starts[-1] < 3.5, f"25 starts at 10 a second should take about 2 seconds, took {starts[-1]:.2f}"


def test_fetch_page_retries_server_errors_with_exponential_backoff_and_jitter(fetcher):
    client = ScriptedClient(503, 502, 200)
    page, report, took = fetch(fetcher, client, backoff=0.05, rng=EdgeRng())
    assert not isinstance(page, Exception), f"Expected a Page after two 5xx answers, got {page!r}"
    assert page.links == ("/a", "/b") and page.path == "/x"
    assert client.calls == 3 and (report.requests, report.retries) == (3, 2)
    # (0.05 * 2**0 + 0.05) + (0.05 * 2**1 + 0.05) with the largest jitter
    assert 0.24 <= took < 0.6, f"The two backoff sleeps should add up to 0.25 s with this rng, took {took:.2f} s"

    always = ScriptedClient(503)
    failed, report, _ = fetch(fetcher, always, retries=3)
    assert isinstance(failed, fetcher.FetchFailed) and str(failed) == "503 Service Unavailable after 4 attempts"
    assert always.calls == 4 and (report.requests, report.retries) == (4, 3)


def test_fetch_page_never_retries_other_4xx_and_never_sleeps_after_the_last_attempt(fetcher):
    gone = ScriptedClient(404, 200)
    failed, report, _ = fetch(fetcher, gone)
    assert isinstance(failed, fetcher.FetchFailed) and str(failed) == "404 Not Found"
    assert gone.calls == 1, "A 404 should not be retried"

    once = ScriptedClient(500)
    failed, _, took = fetch(fetcher, once, retries=0, backoff=5.0)
    assert str(failed) == "500 Internal Server Error after 1 attempts"
    assert took < 1.0, "There should be no backoff sleep after the last attempt"


def test_fetch_page_times_out_and_honours_retry_after(fetcher):
    slow = ScriptedClient("hang")
    failed, report, took = fetch(fetcher, slow, retries=1, timeout=0.1)
    assert isinstance(failed, fetcher.FetchFailed) and str(failed) == "timed out after 2 attempts"
    assert took < 1.5, "Each attempt should be cut off by asyncio.timeout(timeout)"

    limited = ScriptedClient((429, {"Retry-After": "0.3"}), 200)
    page, report, took = fetch(fetcher, limited)
    assert not isinstance(page, Exception), f"Expected a Page after a 429, got {page!r}"
    assert limited.calls == 2 and report.retries == 1
    assert took >= 0.29, f"A 429 with Retry-After: 0.3 should wait 0.3 s before retrying, waited {took:.2f} s"


def test_with_no_retries_five_pages_fail(fetcher):
    report = crawl(fetcher, MockCatalogueAPI(), retries=0)
    assert report.failures == {
        "/c/cups?page=2": "503 Service Unavailable after 1 attempts",
        "/p/copper-kettle": "timed out after 1 attempts",
        "/p/discontinued-grinder": "404 Not Found",
        "/p/eth-yirgacheffe-1kg": "503 Service Unavailable after 1 attempts",
        "/p/hand-grinder": "503 Service Unavailable after 1 attempts",
    }
    assert report.retries == 0


def test_max_pages_limits_the_crawl(fetcher):
    client = MockCatalogueAPI()
    report = crawl(fetcher, client, max_pages=10)
    handled = len(report.pages) + len(report.failures)
    assert 1 <= handled <= 10, f"max_pages=10 should allow at most 10 pages and failures between them, got {handled}"
    assert client.stats["requests"] - report.retries <= 10


def test_cancelling_a_crawl_leaves_nothing_running(fetcher):
    async def run():
        task = asyncio.create_task(fetcher.crawl(MockCatalogueAPI(), rng=random.Random(7)))
        await asyncio.sleep(0.5)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        await asyncio.sleep(0)
        return [t for t in asyncio.all_tasks() if t is not asyncio.current_task()]

    left = asyncio.run(asyncio.wait_for(run(), 30))
    assert left == [], f"{len(left)} task(s) were still running after the crawl was cancelled"
