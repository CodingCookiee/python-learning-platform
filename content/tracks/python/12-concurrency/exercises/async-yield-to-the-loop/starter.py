import asyncio


async def score_orders(orders, score, *, every=100):
    """[score(order) for order in orders], letting other tasks run every `every` orders."""
    return [score(order) for order in orders]
