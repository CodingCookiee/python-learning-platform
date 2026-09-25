def with_task(tasks, task):
    """Return a new list: tasks with task added at the end. Don't modify tasks."""
    updated = list(tasks)
    updated.append(task)
    return updated
