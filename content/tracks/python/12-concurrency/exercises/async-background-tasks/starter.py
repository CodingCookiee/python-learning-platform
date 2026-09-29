import asyncio


class BackgroundTasks:
    """Fire-and-forget tasks that can't be garbage collected, lose errors or outlive drain()."""

    def __init__(self):
        self.errors = []

    def spawn(self, coro):
        """Start coro as a task, keep it alive until it finishes, and return it."""
        return asyncio.create_task(coro)

    @property
    def pending(self):
        """How many spawned tasks haven't finished."""
        ...

    async def drain(self):
        """Wait for every task, including ones spawned while waiting."""
        ...
