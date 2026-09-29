import heapq
from itertools import count


class Sleep:
    """Await Sleep(ticks) to pause for that many ticks of the virtual clock."""

    def __init__(self, ticks):
        self.ticks = ticks

    def __await__(self):
        yield self.ticks


def run(coros):
    """Run the coroutines concurrently; return [(finished_at, result), ...] in finishing order."""
    order = count()
    sleeping = [(0, next(order), coro) for coro in coros]
    heapq.heapify(sleeping)
    finished = []
    while sleeping:
        now, _, coro = heapq.heappop(sleeping)
        try:
            ticks = coro.send(None)
        except StopIteration as done:
            finished.append((now, done.value))
        else:
            heapq.heappush(sleeping, (now + ticks, next(order), coro))
    return finished
