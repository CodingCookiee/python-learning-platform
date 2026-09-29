import sys


def _contents(obj):
    """The objects directly reachable from obj."""
    if isinstance(obj, dict):
        for key, value in obj.items():
            yield key
            yield value
    elif isinstance(obj, (list, tuple, set, frozenset)):
        yield from obj
    elif hasattr(obj, "__dict__"):
        yield vars(obj)


def deep_size(obj):
    """sys.getsizeof of obj plus everything reachable from it, each object counted once."""
    seen = set()
    to_visit = [obj]
    total = 0
    while to_visit:
        current = to_visit.pop()
        if id(current) in seen:
            continue
        seen.add(id(current))
        total += sys.getsizeof(current)
        to_visit.extend(_contents(current))
    return total
