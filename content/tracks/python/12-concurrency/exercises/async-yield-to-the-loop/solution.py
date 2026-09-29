import asyncio


async def score_orders(orders, score, *, every=100):
    """[score(order) for order in orders], letting other tasks run every `every` orders."""
    scores = []
    for n, order in enumerate(orders, start=1):
        scores.append(score(order))
        if n % every == 0:
            await asyncio.sleep(0)
    return scores
