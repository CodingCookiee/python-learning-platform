import pickle


def parallel_map(fn, items, *, workers, map_fn=map):
    """[fn(item) for item in items], computed one chunk per job through map_fn."""
    return list(map_fn(fn, items))
