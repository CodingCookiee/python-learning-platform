import asyncio
from decimal import Decimal

import httpx

RETRY_STATUSES = {429, 500, 502, 503, 504}


def wait_before_retry(response, attempt):
    """Retry-After seconds when the server sent them, otherwise exponential backoff."""
    if response is not None:
        value = response.headers.get("Retry-After", "").strip()
        if value.isdigit():
            return float(value)
    return 2 ** attempt


async def sync_prices(client, skus, *, limit=4, attempts=3, sleep=asyncio.sleep):
    """Fetch every SKU's price concurrently. Returns (prices, failed), both in the order of skus."""
    semaphore = asyncio.Semaphore(limit)

    async def fetch_price(sku):
        for attempt in range(attempts):
            async with semaphore:
                try:
                    response = await client.get(f"/v1/prices/{sku}")
                except httpx.TransportError:
                    response = None
            if response is not None and response.is_success:
                return "ok", Decimal(response.json()["price"])
            reason = "no response" if response is None else f"HTTP {response.status_code}"
            retryable = response is None or response.status_code in RETRY_STATUSES
            if not retryable or attempt == attempts - 1:
                return "failed", reason
            await sleep(wait_before_retry(response, attempt))

    outcomes = await asyncio.gather(*(fetch_price(sku) for sku in skus))
    prices = {sku: value for sku, (kind, value) in zip(skus, outcomes) if kind == "ok"}
    failed = {sku: value for sku, (kind, value) in zip(skus, outcomes) if kind == "failed"}
    return prices, failed
