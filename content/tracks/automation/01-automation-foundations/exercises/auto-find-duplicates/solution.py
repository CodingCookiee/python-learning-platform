import hashlib
from collections import defaultdict
from pathlib import Path


def digest(path):
    with path.open("rb") as fh:
        return hashlib.file_digest(fh, "sha256").hexdigest()


def find_duplicates(folder):
    """Groups of relative paths (sorted) whose files have identical contents, sorted."""
    by_size = defaultdict(list)
    for path in folder.rglob("*"):
        if path.is_file():
            by_size[path.stat().st_size].append(path)

    by_hash = defaultdict(list)
    for same_size in by_size.values():
        if len(same_size) < 2:
            continue  # a file with a unique size can't have a duplicate
        for path in same_size:
            by_hash[digest(path)].append(path.relative_to(folder).as_posix())

    return sorted(sorted(names) for names in by_hash.values() if len(names) > 1)
