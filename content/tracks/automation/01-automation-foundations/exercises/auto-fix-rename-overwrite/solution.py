from pathlib import Path


def free_path(dst):
    """dst if nothing is there, otherwise the first free dst-2, dst-3, ..."""
    candidate, n = dst, 2
    while candidate.exists():
        candidate = dst.with_name(f"{dst.stem}-{n}{dst.suffix}")
        n += 1
    return candidate


def apply_renames(folder, renames):
    """Rename folder/old to folder/new for each pair; return the final names. Never overwrite."""
    final = []
    for old, new in renames.items():
        src = folder / old
        dst = folder / new
        if src != dst:
            dst = free_path(dst)
            src.rename(dst)
        final.append(dst.name)
    return final
