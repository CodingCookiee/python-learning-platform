from itertools import batched


def upload_requests(rows, size):
    """Request bodies of at most size rows each: [{"batch": 1, "rows": [...]}, ...]."""
    return [
        {"batch": number, "rows": list(chunk)}
        for number, chunk in enumerate(batched(rows, size), start=1)
    ]
