import asyncio
import contextlib

from plp import hidden, test
from solution import thumbnails


@contextlib.asynccontextmanager
async def finishes_within(seconds):
    """Fail the test, instead of hanging, if the block is still running after `seconds`."""
    try:
        async with asyncio.timeout(seconds):
            yield
    except TimeoutError:
        raise AssertionError(f"thumbnails was still running after {seconds} s: do the resizers know when to stop?") from None


class Studio:
    """Fake download and resize coroutines that measure what the pipeline does."""

    def __init__(self, download_delay=0.01, resize_delay=0.03):
        self.download_delay = download_delay
        self.resize_delay = resize_delay
        self.downloading = self.resizing = self.waiting = 0
        self.peak_downloading = self.peak_resizing = self.peak_waiting = 0
        self.last_download_end = 0.0
        self.first_resize_start = None

    async def download(self, url):
        self.downloading += 1
        self.peak_downloading = max(self.peak_downloading, self.downloading)
        await asyncio.sleep(self.download_delay)
        self.downloading -= 1
        self.waiting += 1                    # downloaded, not yet being resized
        self.peak_waiting = max(self.peak_waiting, self.waiting)
        self.last_download_end = asyncio.get_running_loop().time()
        return f"image:{url}"

    async def resize(self, image):
        if self.first_resize_start is None:
            self.first_resize_start = asyncio.get_running_loop().time()
        self.waiting -= 1
        self.resizing += 1
        self.peak_resizing = max(self.peak_resizing, self.resizing)
        await asyncio.sleep(self.resize_delay)
        self.resizing -= 1
        return image.replace("image:", "thumb:")


def photos(count):
    return [f"https://cdn.example.com/p/{n}.jpg" for n in range(1, count + 1)]


@test("Makes a thumbnail for every photo, in order")
async def _():
    studio = Studio()
    urls = photos(8)
    async with finishes_within(1.5):
        assert await thumbnails(urls, studio.download, studio.resize, downloaders=3, resizers=2, buffer=4) == {
            url: f"thumb:{url}" for url in urls
        }


@test("Runs the right number of workers in each stage")
async def _():
    studio = Studio()
    async with finishes_within(1.5):
        await thumbnails(photos(12), studio.download, studio.resize, downloaders=3, resizers=2, buffer=4)
    assert (studio.peak_downloading, studio.peak_resizing) == (3, 2)


@test("Resizing starts before the downloads are finished")
async def _():
    studio = Studio()
    async with finishes_within(1.5):
        await thumbnails(photos(12), studio.download, studio.resize, downloaders=3, resizers=2, buffer=4)
    assert studio.first_resize_start is not None, "nothing was resized"
    assert studio.first_resize_start < studio.last_download_end, "no resizing started until every download had finished"


@test("Downloads wait when the buffer is full")
async def _():
    studio = Studio(download_delay=0.005, resize_delay=0.03)
    async with finishes_within(1.5):
        await thumbnails(photos(12), studio.download, studio.resize, downloaders=3, resizers=1, buffer=2)
    assert studio.first_resize_start is not None, "nothing was resized"
    assert studio.peak_waiting <= 2 + 3, (
        f"{studio.peak_waiting} downloaded images were waiting to be resized at once; "
        "with buffer=2 and 3 downloaders there should never be more than 5"
    )


@hidden("No photos, no thumbnails")
async def _():
    studio = Studio()
    async with finishes_within(1.5):
        assert await thumbnails([], studio.download, studio.resize, downloaders=3, resizers=2, buffer=4) == {}


@hidden("More workers than photos")
async def _():
    studio = Studio()
    urls = photos(2)
    async with finishes_within(1.5):
        assert await thumbnails(urls, studio.download, studio.resize, downloaders=5, resizers=4, buffer=1) == {
            url: f"thumb:{url}" for url in urls
        }
