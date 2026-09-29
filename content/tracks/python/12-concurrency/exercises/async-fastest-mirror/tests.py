import asyncio

from plp import hidden, raises_async, test
from solution import fastest

PATH = "/simple/httpx/httpx-0.28.1.tar.gz"


class Network:
    """Shared by the fake mirrors: which requests are running, and which were cancelled."""

    def __init__(self):
        self.running = set()
        self.cancelled = set()


class Mirror:
    """A fake package mirror that answers after `delay` seconds, or raises `error`."""

    def __init__(self, network, name, delay, error=None):
        self.network = network
        self.name = name
        self.delay = delay
        self.error = error

    async def get(self, path):
        self.network.running.add(self.name)
        try:
            await asyncio.sleep(self.delay)
        except asyncio.CancelledError:
            self.network.cancelled.add(self.name)
            raise
        finally:
            self.network.running.discard(self.name)
        if self.error:
            raise self.error
        return f"{self.name}:{path}".encode()


@test("The first mirror to answer wins")
async def _():
    net = Network()
    mirrors = [Mirror(net, "eu-west", 0.3), Mirror(net, "us-east", 0.01), Mirror(net, "ap-south", 0.5)]
    assert await fastest(mirrors, PATH) == ("us-east", f"us-east:{PATH}".encode())


@test("The losers are cancelled, and have stopped by the time it returns")
async def _():
    net = Network()
    mirrors = [Mirror(net, "eu-west", 0.3), Mirror(net, "us-east", 0.01), Mirror(net, "ap-south", 0.5)]
    await fastest(mirrors, PATH)
    assert net.running == set(), f"still running: {sorted(net.running)}"
    assert net.cancelled == {"eu-west", "ap-south"}


@test("A mirror that fails is skipped")
async def _():
    net = Network()
    mirrors = [Mirror(net, "us-east", 0.0, error=ConnectionError("503 from us-east")), Mirror(net, "eu-west", 0.03)]
    assert await fastest(mirrors, PATH) == ("eu-west", f"eu-west:{PATH}".encode())


@test("When every mirror fails, all the errors come back in an ExceptionGroup")
async def _():
    net = Network()
    mirrors = [
        Mirror(net, "eu-west", 0.02, error=ConnectionError("eu-west: connection refused")),
        Mirror(net, "us-east", 0.01, error=TimeoutError("us-east: read timed out")),
    ]
    group = await raises_async(ExceptionGroup, fastest, mirrors, PATH, match="every mirror failed")
    assert sorted(str(error) for error in group.exceptions) == [
        "eu-west: connection refused",
        "us-east: read timed out",
    ]


@hidden("Returns as soon as the winner answers")
async def _():
    net = Network()
    mirrors = [Mirror(net, "eu-west", 1.0), Mirror(net, "us-east", 0.01)]
    loop = asyncio.get_running_loop()
    start = loop.time()
    await fastest(mirrors, PATH)
    elapsed = loop.time() - start
    assert elapsed < 0.3, f"it took {elapsed:.2f} s; the winner answered after 0.01 s"


@hidden("Cancelling fastest cancels every request it started")
async def _():
    net = Network()
    mirrors = [Mirror(net, "eu-west", 1.0), Mirror(net, "us-east", 1.0)]
    race = asyncio.create_task(fastest(mirrors, PATH))
    await asyncio.sleep(0.02)
    race.cancel()
    try:
        await race
    except asyncio.CancelledError:
        pass
    await asyncio.sleep(0)
    assert net.cancelled == {"eu-west", "us-east"}
    assert net.running == set()
