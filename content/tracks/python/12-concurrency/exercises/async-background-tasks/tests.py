import asyncio
import contextlib
import gc
import weakref

from plp import hidden, test
from solution import BackgroundTasks


@contextlib.asynccontextmanager
async def finishes_within(seconds):
    """Fail the test, instead of hanging, if the block is still running after `seconds`."""
    try:
        async with asyncio.timeout(seconds):
            yield
    except TimeoutError:
        raise AssertionError(f"drain() was still waiting after {seconds} s") from None


async def process(webhook, log, delay=0.01, error=None):
    await asyncio.sleep(delay)
    if error:
        raise error
    log.append(webhook)


async def wait_for_signal(signals, log):
    """Waits on an event that only this coroutine refers to (the test keeps a weak reference)."""
    arrived = asyncio.Event()
    signals.append(weakref.ref(arrived))
    await arrived.wait()
    log.append("signal handled")


@test("Processes webhooks in the background, and drain waits for them")
async def _():
    background, log = BackgroundTasks(), []
    for webhook in ["wh_1", "wh_2", "wh_3"]:
        background.spawn(process(webhook, log))
    assert log == []
    async with finishes_within(1):
        await background.drain()
    assert sorted(log) == ["wh_1", "wh_2", "wh_3"]


@test("A task nobody else refers to survives garbage collection")
async def _():
    background, signals, log = BackgroundTasks(), [], []
    background.spawn(wait_for_signal(signals, log))
    await asyncio.sleep(0)
    gc.collect()
    event = signals[0]()
    assert event is not None, "the task was garbage collected: spawn must keep a strong reference to it"
    event.set()
    del event
    async with finishes_within(1):
        await background.drain()
    assert log == ["signal handled"]


@test("pending counts the tasks that haven't finished")
async def _():
    background, log = BackgroundTasks(), []
    first = background.spawn(process("wh_1", log, delay=0.01))
    background.spawn(process("wh_2", log, delay=0.2))
    assert background.pending == 2
    async with finishes_within(1):
        await first
    await asyncio.sleep(0)
    assert background.pending == 1
    async with finishes_within(1):
        await background.drain()
    assert background.pending == 0


@test("Failures are collected in errors, and drain doesn't raise")
async def _():
    background, log = BackgroundTasks(), []
    background.spawn(process("wh_18", log))
    background.spawn(process("wh_19", log, delay=0.02, error=ValueError("wh_19: unknown event type")))
    async with finishes_within(1):
        await background.drain()
    assert [str(error) for error in background.errors] == ["wh_19: unknown event type"]
    assert log == ["wh_18"]


@hidden("drain also waits for tasks spawned while it's waiting")
async def _():
    background, log = BackgroundTasks(), []

    async def process_then_retry():
        await asyncio.sleep(0.01)
        background.spawn(process("wh_retry", log, delay=0.02))

    background.spawn(process_then_retry())
    async with finishes_within(1):
        await background.drain()
    assert log == ["wh_retry"]


@hidden("spawn returns the task, and a cancelled task isn't an error")
async def _():
    background, log = BackgroundTasks(), []
    task = background.spawn(process("wh_slow", log, delay=1))
    assert isinstance(task, asyncio.Task)
    task.cancel()
    async with finishes_within(1):
        await background.drain()
    assert background.errors == [] and background.pending == 0
