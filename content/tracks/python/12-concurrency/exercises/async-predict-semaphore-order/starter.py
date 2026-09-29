import asyncio


async def upload(photo, seconds, limit):
    async with limit:
        print(f"start {photo}")
        await asyncio.sleep(seconds)
        print(f"done  {photo}")


async def main():
    limit = asyncio.Semaphore(2)
    await asyncio.gather(
        upload("beach.jpg", 0.2, limit),
        upload("cake.jpg", 0.04, limit),
        upload("dog.jpg", 0.04, limit),
        upload("menu.jpg", 0.04, limit),
    )
    print("all uploaded")


asyncio.run(main())
