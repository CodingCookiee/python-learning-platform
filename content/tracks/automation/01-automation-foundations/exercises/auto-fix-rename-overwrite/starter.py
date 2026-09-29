from pathlib import Path


def apply_renames(folder, renames):
    """Rename folder/old to folder/new for each pair; return the final names. Never overwrite."""
    final = []
    for old, new in renames.items():
        src = folder / old
        dst = folder / new
        src.rename(dst)
        final.append(dst.name)
    return final
