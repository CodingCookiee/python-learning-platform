import asyncio
import contextlib

from plp import hidden, test
from solution import process_all


@contextlib.asynccontextmanager
async def finishes_within(seconds):
    """Fail the test, instead of hanging, if the block is still running after `seconds`."""
    try:
        async with asyncio.timeout(seconds):
            yield
    except TimeoutError:
        raise AssertionError(f"process_all was still running after {seconds} s") from None


class Renderer:
    """A fake PDF renderer: records which task ran each job, and how many ran at once."""

    def __init__(self, fail_on=None):
        self.fail_on = fail_on
        self.active = 0
        self.peak = 0
        self.tasks = set()
        self.rendered = []

    async def render(self, invoice):
        self.tasks.add(asyncio.current_task())
        self.active += 1
        self.peak = max(self.peak, self.active)
        try:
            await asyncio.sleep(0.01 * invoice["pages"])
            if invoice["id"] == self.fail_on:
                raise ValueError(f"{invoice['id']}: template missing")
        finally:
            self.active -= 1
        self.rendered.append(invoice["id"])
        return f"{invoice['id']}.pdf"


def invoices(count):
    return [{"id": f"INV-{n}", "pages": 1 + n % 3} for n in range(1, count + 1)]


@test("Renders ten invoices with three workers")
async def _():
    renderer = Renderer()
    async with finishes_within(1):
        assert await process_all(invoices(10), renderer.render, workers=3) == [f"INV-{n}.pdf" for n in range(1, 11)]
    assert renderer.peak == 3, f"{renderer.peak} invoice(s) were rendering at once; expected 3"


@test("Uses exactly `workers` worker tasks")
async def _():
    renderer = Renderer()
    async with finishes_within(1):
        await process_all(invoices(10), renderer.render, workers=3)
    assert len(renderer.tasks) == 3, f"the jobs ran in {len(renderer.tasks)} different tasks, not 3 workers"


@test("Results come back in job order, not finishing order")
async def _():
    jobs = [{"id": "INV-long", "pages": 6}, {"id": "INV-short", "pages": 1}]
    renderer = Renderer()
    async with finishes_within(1):
        assert await process_all(jobs, renderer.render, workers=2) == ["INV-long.pdf", "INV-short.pdf"]
    assert renderer.rendered == ["INV-short", "INV-long"]


@hidden("More workers than jobs, and no jobs at all")
async def _():
    async with finishes_within(1):
        assert await process_all(invoices(2), Renderer().render, workers=5) == ["INV-1.pdf", "INV-2.pdf"]
        assert await process_all([], Renderer().render, workers=3) == []


@hidden("A failing job makes process_all raise instead of hanging")
async def _():
    renderer = Renderer(fail_on="INV-4")
    try:
        async with finishes_within(1):
            await process_all(invoices(8), renderer.render, workers=2)
    except (ValueError, ExceptionGroup) as error:
        errors = error.exceptions if isinstance(error, ExceptionGroup) else [error]
        assert any("template missing" in str(e) for e in errors), f"process_all raised {error!r}"
        return
    raise AssertionError("process_all finished without raising, but INV-4 failed")
