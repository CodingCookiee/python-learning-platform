import random


def backoff_delay(attempt, *, base=0.5, cap=30.0, rng=random):
    """Seconds to wait before retry number `attempt` (from 0): full jitter under a capped exponential."""
    return rng.uniform(0, min(cap, base * 2 ** attempt))
