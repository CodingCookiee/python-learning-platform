from pathlib import Path


def find_logs(folder):
    """Every .log file under folder, as sorted relative paths like "nginx/access.log"."""
    root = Path(folder)
    return sorted(p.relative_to(root).as_posix() for p in root.rglob("*.log") if p.is_file())
