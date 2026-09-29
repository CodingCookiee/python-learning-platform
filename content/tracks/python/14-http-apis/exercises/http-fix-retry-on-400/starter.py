import random
import time

import httpx


def backoff(attempt, rng):
    return rng.uniform(0, min(30.0, 0.5 * 2 ** attempt))


def get_with_retries(client, url, *, attempts=4, sleep=time.sleep, rng=random):
    """GET url, retrying failures that might succeed on another attempt."""
    for attempt in range(attempts):
        try:
            return client.get(url).raise_for_status()
        except httpx.HTTPError:
            if attempt == attempts - 1:
                raise
            sleep(backoff(attempt, rng))
