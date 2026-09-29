import asyncio


async def fetch_balances(client, accounts):
    """{"balances": {...}, "total": ...}, with every balance fetched at the same time."""
    ...


def get_balances(client, accounts):
    """The same result, for synchronous callers."""
    ...
