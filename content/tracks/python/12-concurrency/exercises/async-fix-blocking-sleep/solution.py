import asyncio


async def fetch_with_retry(client, url, *, attempts=3, backoff=0.05):
    """GET url, pausing backoff * attempt seconds before each retry."""
    for attempt in range(1, attempts + 1):
        try:
            return await client.get(url)
        except ConnectionError:
            if attempt == attempts:
                raise
            await asyncio.sleep(backoff * attempt)
