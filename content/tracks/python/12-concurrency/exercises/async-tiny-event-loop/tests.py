from plp import hidden, raises, test
from solution import Sleep, run


async def download(name, *chunk_ticks):
    for ticks in chunk_ticks:
        await Sleep(ticks)
    return name


@test("Runs three downloads on a virtual clock")
def _():
    jobs = [download("invoice.pdf", 3, 3), download("logo.png", 1), download("report.csv", 2, 2, 2)]
    assert run(jobs) == [(1, "logo.png"), (6, "invoice.pdf"), (6, "report.csv")]


@test("A coroutine that never sleeps finishes at tick 0, in list order")
def _():
    async def cached(name):
        return name

    assert run([cached("rates.json"), cached("fx.json")]) == [(0, "rates.json"), (0, "fx.json")]


@test("Sleep(0) lets the others take a turn")
def _():
    log = []

    async def worker(name, steps):
        for step in range(steps):
            log.append(f"{name}{step}")
            await Sleep(0)
        return name

    assert run([worker("a", 3), worker("b", 2)]) == [(0, "b"), (0, "a")]
    assert log == ["a0", "b0", "a1", "b1", "a2"]


@test("Jumps straight to the next wake-up time")
def _():
    assert run([download("nightly-backup.tar", 10**9, 10**9)]) == [(2 * 10**9, "nightly-backup.tar")]


@hidden("Awaiting another coroutine passes its sleeps through")
def _():
    async def fetch(page):
        await Sleep(page)
        return f"page {page}"

    async def crawl():
        first = await fetch(2)
        second = await fetch(5)
        return [first, second]

    assert run([crawl(), download("logo.png", 4)]) == [(4, "logo.png"), (7, ["page 2", "page 5"])]


@hidden("An exception inside a coroutine propagates")
def _():
    async def broken():
        await Sleep(1)
        raise ConnectionError("upstream closed the connection")

    raises(ConnectionError, run, [download("logo.png", 3), broken()], match="closed")


@hidden("No coroutines, no results")
def _():
    assert run([]) == []
