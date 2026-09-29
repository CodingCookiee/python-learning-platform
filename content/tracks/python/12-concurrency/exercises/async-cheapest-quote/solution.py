import asyncio


async def _quote_within(provider, parcel, seconds):
    async with asyncio.timeout(seconds):
        return await provider.quote(parcel)


async def cheapest_quote(providers, parcel, *, seconds):
    """(name, price) of the cheapest quote that arrives within `seconds`."""
    outcomes = await asyncio.gather(
        *(_quote_within(provider, parcel, seconds) for provider in providers),
        return_exceptions=True,
    )
    quotes = [
        (price, position, provider.name)
        for position, (provider, price) in enumerate(zip(providers, outcomes))
        if not isinstance(price, Exception)
    ]
    if not quotes:
        raise LookupError("no shipping quotes")
    price, _, name = min(quotes)
    return name, price
