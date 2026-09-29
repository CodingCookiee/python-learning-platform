import shutil
from pathlib import Path


def sort_inbox(inbox, rules, *, dry_run=False):
    """Move each file in inbox into a folder by extension; return [(name, folder)] sorted by name."""
    folder_for = {ext.lower(): folder for folder, extensions in rules.items() for ext in extensions}
    plan = [
        (path.name, folder_for.get(path.suffix.lower(), "other"))
        for path in sorted(inbox.iterdir())
        if path.is_file() and not path.name.startswith(".")
    ]
    if not dry_run:
        for name, folder in plan:
            (inbox / folder).mkdir(exist_ok=True)
            shutil.move(inbox / name, inbox / folder / name)
    return plan
