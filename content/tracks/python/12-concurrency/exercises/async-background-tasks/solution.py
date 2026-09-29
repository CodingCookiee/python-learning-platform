import asyncio


class BackgroundTasks:
    """Fire-and-forget tasks that can't be garbage collected, lose errors or outlive drain()."""

    def __init__(self):
        self.errors = []
        self._tasks = set()

    def spawn(self, coro):
        """Start coro as a task, keep it alive until it finishes, and return it."""
        task = asyncio.create_task(coro)
        self._tasks.add(task)
        task.add_done_callback(self._finished)
        return task

    def _finished(self, task):
        self._tasks.discard(task)
        if not task.cancelled() and task.exception() is not None:
            self.errors.append(task.exception())

    @property
    def pending(self):
        """How many spawned tasks haven't finished."""
        return len(self._tasks)

    async def drain(self):
        """Wait for every task, including ones spawned while waiting."""
        while self._tasks:
            await asyncio.gather(*self._tasks, return_exceptions=True)
