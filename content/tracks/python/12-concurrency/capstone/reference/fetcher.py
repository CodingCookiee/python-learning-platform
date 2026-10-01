"""Concurrent fetcher: crawl the Kiln & Co catalogue API concurrently, politely and reliably.

Run it with:  python fetcher.py
"""

import asyncio
import json
import random
from collections import deque
from decimal import Decimal
from dataclasses import dataclass, field
from http import HTTPStatus

# ---------------------------------------------------------------------------
# The mock API. Don't change this part: the review runs your crawler against it.
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
# Your crawler
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Page:
    path: str
    title: str
    links: tuple
    product: dict | None


@dataclass
class CrawlReport:
    pages: dict = field(default_factory=dict)       # path -> Page
    failures: dict = field(default_factory=dict)    # path -> reason
    requests: int = 0
    retries: int = 0
    elapsed: float = 0.0


class Throttle:
    """At most `per_second` request starts in any one-second window."""

    def __init__(self, per_second):
        self.per_second = per_second
        self.starts = deque()

    async def wait(self):
        loop = asyncio.get_running_loop()
        while True:
            now = loop.time()
            while self.starts and now - self.starts[0] >= 1.0:
                self.starts.popleft()
            if len(self.starts) < self.per_second:
                # No await between the check and the append, so no other task can slip in
                self.starts.append(now)
                return
            await asyncio.sleep(1.0 - (now - self.starts[0]))


class FetchFailed(Exception):
    """A page that can't be fetched: a 4xx, or a 5xx or timeout on every attempt."""


def describe(status):
    return f"{status} {HTTPStatus(status).phrase}"


async def fetch_page(client, path, *, throttle, report, retries, timeout, backoff, rng):
    """GET one page, with a time limit, retries and backoff. Returns a Page or raises FetchFailed."""
    attempts = retries + 1
    problem = ""
    for attempt in range(1, attempts + 1):
        await throttle.wait()
        report.requests += 1
        if attempt > 1:
            report.retries += 1
        retry_after = None
        try:
            async with asyncio.timeout(timeout):
                response = await client.get(path)
        except TimeoutError:
            problem = "timed out"
        else:
            if response.status == 200:
                data = response.json()
                return Page(path, data["title"], tuple(data["links"]), data["product"])
            problem = describe(response.status)
            if response.status == 429:
                retry_after = float(response.headers["Retry-After"])
            elif 400 <= response.status < 500:
                raise FetchFailed(problem)
        if attempt < attempts:
            if retry_after is None:
                await asyncio.sleep(backoff * 2 ** (attempt - 1) + rng.uniform(0, backoff))
            else:
                await asyncio.sleep(retry_after)
    raise FetchFailed(f"{problem} after {attempts} attempts")


async def crawl(client, start="/", *, concurrency=4, per_second=15, retries=3, timeout=0.5,
                backoff=0.1, max_pages=200, rng=None):
    """Visit every page reachable from `start`, at most once each, and return a CrawlReport."""
    rng = rng or random.Random()
    loop = asyncio.get_running_loop()
    began = loop.time()
    report = CrawlReport()
    throttle = Throttle(per_second)
    queue = asyncio.Queue()
    seen = {start}
    queue.put_nowait(start)

    async def worker():
        while True:
            path = await queue.get()
            try:
                page = await fetch_page(client, path, throttle=throttle, report=report, retries=retries,
                                        timeout=timeout, backoff=backoff, rng=rng)
            except FetchFailed as error:
                report.failures[path] = str(error)
            else:
                report.pages[path] = page
                # No await in this loop, so the seen set needs no lock
                for link in page.links:
                    if link not in seen and len(seen) < max_pages:
                        seen.add(link)
                        queue.put_nowait(link)
            finally:
                queue.task_done()

    workers = [asyncio.create_task(worker()) for _ in range(concurrency)]
    try:
        await queue.join()
    finally:
        for task in workers:
            task.cancel()
        await asyncio.gather(*workers, return_exceptions=True)
        report.elapsed = loop.time() - began
    return report


def format_report(report, client_stats):
    """The report text, as shown in the brief."""
    lines = [
        f"{'Pages fetched':<16}{len(report.pages):>4}",
        f"{'Failed':<16}{len(report.failures):>4}",
        f"{'Requests':<16}{report.requests:>4}   ({report.retries} retries)",
        f"{'Peak in flight':<16}{client_stats['peak_in_flight']:>4}",
        f"{'Rate limited':<16}{client_stats['429']:>4}",
        f"{'Elapsed':<16}{report.elapsed:>4.1f} s",
        "",
        "Failures",
    ]
    for path in sorted(report.failures):
        lines.append(f"  {path:<26} {report.failures[path]}")
    products = [page.product for page in report.pages.values() if page.product]
    products.sort(key=lambda product: (-Decimal(product["price"]), product["sku"]))
    lines += ["", f"Products ({len(products)}), most expensive first"]
    for product in products[:5]:
        lines.append(f"  {product['sku']:<22} {product['name']:<32} {Decimal(product['price']):>7.2f}")
    if len(products) > 5:
        lines.append(f"  ... and {len(products) - 5} more")
    return "\n".join(lines)


def main():
    client = MockCatalogueAPI()
    report = asyncio.run(crawl(client, rng=random.Random(7)))
    print(format_report(report, client.stats))


if __name__ == "__main__":
    main()
