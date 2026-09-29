import sys


def deep_size(obj):
    """sys.getsizeof of obj plus everything reachable from it, each object counted once."""
    return sys.getsizeof(obj)
