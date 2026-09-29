import asyncio

from plp import hidden, test
from solution import score_orders


def fraud_score(order):
    return round(order["total"] / 100 + (5 if order["country"] != order["card_country"] else 0), 2)


def orders(count):
    return [
        {"id": f"A-{n}", "total": 10 + n % 400, "country": "GB", "card_country": "GB" if n % 7 else "US"}
        for n in range(count)
    ]


async def turns_given(run):
    """How many times another task got to run while `run` was being awaited."""
    turns = 0

    async def other_task():
        nonlocal turns
        while True:
            await asyncio.sleep(0)
            turns += 1

    watcher = asyncio.create_task(other_task())
    await asyncio.sleep(0)
    start = turns
    result = await run
    during = turns - start
    watcher.cancel()
    return result, during


@test("Scores 1,000 orders and lets other tasks run about 10 times")
async def _():
    batch = orders(1000)
    scores, turns = await turns_given(score_orders(batch, fraud_score))
    assert scores == [fraud_score(order) for order in batch]
    assert 9 <= turns <= 12, f"other tasks ran {turns} times while 1,000 orders were scored"


@test("every sets how often it yields")
async def _():
    _, turns = await turns_given(score_orders(orders(100), fraud_score, every=10))
    assert 9 <= turns <= 12, f"other tasks ran {turns} times; with every=10 and 100 orders, expected about 10"


@test("It doesn't yield after every single order")
async def _():
    _, turns = await turns_given(score_orders(orders(500), fraud_score, every=250))
    assert turns <= 4, f"other tasks ran {turns} times; with every=250 and 500 orders, expected about 2"


@hidden("No orders, no scores")
async def _():
    assert await score_orders([], fraud_score) == []


@hidden("Scores stay in order")
async def _():
    batch = orders(250)[::-1]
    assert await score_orders(batch, fraud_score, every=7) == [fraud_score(order) for order in batch]
