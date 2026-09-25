from collections import Counter
from pathlib import Path


def sort_by_extension(folder):
    """Move each file in folder into a subfolder named after its extension. Return the counts."""
    root = Path(folder)
    counts = Counter()
    for path in [p for p in root.iterdir() if p.is_file()]:
        extension = path.suffix.lstrip(".").lower() or "other"
        target = root / extension
        target.mkdir(exist_ok=True)
        path.rename(target / path.name)
        counts[extension] += 1
    return counts
