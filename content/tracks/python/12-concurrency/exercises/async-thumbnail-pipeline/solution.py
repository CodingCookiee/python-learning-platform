import asyncio

DONE = object()


async def thumbnails(urls, download, resize, *, downloaders, resizers, buffer):
    """{url: thumbnail} for every URL, through a two-stage download -> resize pipeline."""
    to_download = asyncio.Queue()
    for url in urls:
        to_download.put_nowait(url)
    to_resize = asyncio.Queue(maxsize=buffer)
    results = {}

    async def downloader():
        while True:
            try:
                url = to_download.get_nowait()
            except asyncio.QueueEmpty:
                return
            await to_resize.put((url, await download(url)))

    async def download_stage():
        async with asyncio.TaskGroup() as group:
            for _ in range(downloaders):
                group.create_task(downloader())
        for _ in range(resizers):
            await to_resize.put(DONE)

    async def resizer():
        while (item := await to_resize.get()) is not DONE:
            url, image = item
            results[url] = await resize(image)

    async with asyncio.TaskGroup() as group:
        group.create_task(download_stage())
        for _ in range(resizers):
            group.create_task(resizer())
    return {url: results[url] for url in urls}
