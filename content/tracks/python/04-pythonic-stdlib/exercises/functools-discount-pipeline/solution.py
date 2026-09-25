from functools import reduce


def apply_all(price, steps):
    """price after applying every function in steps, in order."""
    return reduce(lambda current, step: step(current), steps, price)
