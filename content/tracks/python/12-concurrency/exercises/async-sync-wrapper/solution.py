import asyncio


async def fetch_balances(client, accounts):
    """{"balances": {...}, "total": ...}, with every balance fetched at the same time."""
    amounts = await asyncio.gather(*(client.balance(account) for account in accounts))
    return {"balances": dict(zip(accounts, amounts)), "total": round(sum(amounts), 2)}


def get_balances(client, accounts):
    """The same result, for synchronous callers."""
    return asyncio.run(fetch_balances(client, accounts))
