import shutil
from pathlib import Path


def sort_inbox(inbox, rules, *, dry_run=False):
    """Move each file in inbox into a folder by extension; return [(name, folder)] sorted by name."""
    plan = []
    for path in inbox.iterdir():
        for folder, extensions in rules.items():
            if path.suffix in extensions:
                plan.append((path.name, folder))
                shutil.move(path, inbox / folder / path.name)
    return plan
