import asyncio
from collections import deque


class Throttle:
    """At most `limit` starts in any window of `period` seconds."""

    def __init__(self, limit, period):
        self.limit = limit
        self.period = period
        self._starts = deque()

    async def wait(self):
        """Return when the caller may start."""
        loop = asyncio.get_running_loop()
        while True:
            now = loop.time()
            while self._starts and now - self._starts[0] >= self.period:
                self._starts.popleft()
            if len(self._starts) < self.limit:
                self._starts.append(now)
                return
            await asyncio.sleep(self._starts[0] + self.period - now)
