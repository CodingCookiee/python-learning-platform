class Sleep:
    """Await Sleep(ticks) to pause for that many ticks of the virtual clock."""

    def __init__(self, ticks):
        self.ticks = ticks

    def __await__(self):
        yield self.ticks


def run(coros):
    """Run the coroutines concurrently; return [(finished_at, result), ...] in finishing order."""
    ...
