def numbered(tasks):
    """Return ["1. first task", "2. second task", ...]."""
    lines = []
    for number, task in enumerate(tasks, start=1):
        lines.append(f"{number}. {task}")
    return lines
