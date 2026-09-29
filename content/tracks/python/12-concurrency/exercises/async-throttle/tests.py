import asyncio

from plp import hidden, test
from solution import Throttle

# Timers can fire a millisecond or so early; allow for that when checking gaps
SLACK = 0.005


async def start_times(throttle, callers, delays=None):
    """Start `callers` coroutines that each wait on the throttle; return when each got through."""
    loop = asyncio.get_running_loop()
    origin = loop.time()
    started = []

    async def caller(delay):
        await asyncio.sleep(delay)
        await throttle.wait()
        started.append(loop.time() - origin)

    await asyncio.gather(*(caller(delay) for delay in (delays or [0] * callers)))
    return sorted(started)


def crowded_windows(starts, limit, period):
    """Pairs of starts that put more than `limit` starts inside one window."""
    return [
        (round(starts[i], 3), round(starts[i + limit], 3))
        for i in range(len(starts) - limit)
        if starts[i + limit] - starts[i] < period - SLACK
    ]


@test("Six messages, two per 0.1 s window")
async def _():
    starts = await start_times(Throttle(limit=2, period=0.1), 6)
    assert crowded_windows(starts, 2, 0.1) == [], "more than 2 starts fell inside one 0.1 s window"
    assert starts[-1] < 0.35, f"the last message started at {starts[-1]:.2f} s; it could have started at 0.2 s"


@test("Under the limit, nobody waits")
async def _():
    starts = await start_times(Throttle(limit=3, period=0.5), 3)
    assert starts[-1] < 0.05, f"the third caller waited {starts[-1]:.2f} s with room in the window"


@test("A full window makes the next caller wait for the oldest start to expire")
async def _():
    starts = await start_times(Throttle(limit=2, period=0.1), 3, delays=[0, 0.04, 0.05])
    assert starts[2] >= 0.1 - SLACK, f"the third message started at {starts[2]:.3f} s, inside the first window"
    assert starts[2] < 0.16, f"the third message waited until {starts[2]:.3f} s; the window freed up at 0.1 s"


@hidden("One coroutine calling in a loop is throttled too")
async def _():
    throttle = Throttle(limit=2, period=0.05)
    loop = asyncio.get_running_loop()
    origin = loop.time()
    starts = []
    for _ in range(5):
        await throttle.wait()
        starts.append(loop.time() - origin)
    assert crowded_windows(starts, 2, 0.05) == []
    assert starts[-1] < 0.2


@hidden("Two throttles don't share their windows")
async def _():
    sms, email = Throttle(limit=1, period=0.2), Throttle(limit=1, period=0.2)
    loop = asyncio.get_running_loop()
    origin = loop.time()
    await sms.wait()
    await email.wait()
    assert loop.time() - origin < 0.05
