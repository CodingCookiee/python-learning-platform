import random
import time

import httpx

RETRY_STATUSES = {429, 500, 502, 503, 504}


def backoff(attempt, rng):
    return rng.uniform(0, min(30.0, 0.5 * 2 ** attempt))


def retry_after(response):
    """Seconds from a Retry-After header in its seconds form, or None."""
    value = response.headers.get("Retry-After", "").strip()
    return float(value) if value.isdigit() else None


def get_with_retries(client, url, *, attempts=5, max_wait=60.0, sleep=time.sleep, rng=random):
    """GET url, retrying rate limits and server errors, and doing what Retry-After says."""
    for attempt in range(attempts):
        response = client.get(url)
        if response.status_code not in RETRY_STATUSES or attempt == attempts - 1:
            return response.raise_for_status()
        wait = retry_after(response)
        if wait is None:
            wait = backoff(attempt, rng)
        elif wait > max_wait:
            return response.raise_for_status()
        sleep(wait)
