class Throttle:
    """At most `limit` starts in any window of `period` seconds."""

    def __init__(self, limit, period):
        self.limit = limit
        self.period = period

    async def wait(self):
        """Return when the caller may start."""
        ...
