from plp import hidden, test
from solution import Job, pick_tool


@test("Webhook fan-out uses asyncio, image resizing uses processes")
def _():
    assert pick_tool(Job(tasks=5_000, bound="io", async_client=True, free_threaded=False)) == "asyncio"
    assert pick_tool(Job(tasks=40, bound="cpu", async_client=False, free_threaded=False)) == "processes"


@test("A blocking SDK means threads")
def _():
    assert pick_tool(Job(tasks=300, bound="io", async_client=False, free_threaded=False)) == "threads"


@test("CPU work on a free-threaded build uses threads")
def _():
    assert pick_tool(Job(tasks=8, bound="cpu", async_client=False, free_threaded=True)) == "threads"


@test("One task runs sequentially, whatever its kind")
def _():
    assert pick_tool(Job(tasks=1, bound="cpu", async_client=False, free_threaded=False)) == "sequential"
    assert pick_tool(Job(tasks=1, bound="io", async_client=True, free_threaded=True)) == "sequential"


@hidden("The build doesn't change the choice for I/O")
def _():
    assert pick_tool(Job(tasks=50, bound="io", async_client=True, free_threaded=True)) == "asyncio"
    assert pick_tool(Job(tasks=50, bound="io", async_client=False, free_threaded=True)) == "threads"


@hidden("An async client doesn't help CPU-bound work")
def _():
    assert pick_tool(Job(tasks=12, bound="cpu", async_client=True, free_threaded=False)) == "processes"
