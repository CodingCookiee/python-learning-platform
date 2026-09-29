import pickle


def _chunk(items, parts):
    """Split items into at most `parts` contiguous, non-empty chunks, as even as possible."""
    parts = min(parts, len(items))
    if parts == 0:
        return []
    base, extra = divmod(len(items), parts)
    chunks, start = [], 0
    for index in range(parts):
        size = base + 1 if index < extra else base
        chunks.append(items[start:start + size])
        start += size
    return chunks


def _apply_to_chunk(fn, chunk):
    """Runs in the worker: one job, a whole chunk."""
    return [fn(item) for item in chunk]


def parallel_map(fn, items, *, workers, map_fn=map):
    """[fn(item) for item in items], computed one chunk per job through map_fn."""
    try:
        pickle.dumps(fn)
    except Exception as error:
        raise TypeError("fn can't be sent to a worker process: pass a top-level function") from error
    chunks = _chunk(list(items), workers)
    results = map_fn(_apply_to_chunk, [fn] * len(chunks), chunks)
    return [value for chunk_result in results for value in chunk_result]
