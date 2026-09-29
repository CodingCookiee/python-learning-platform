import asyncio


async def send(channel, delay):
    print(f"{channel}: sending")
    await asyncio.sleep(delay)
    print(f"{channel}: sent")
    return channel


async def main():
    email = asyncio.create_task(send("email", 0.03))
    sms = send("sms", 0.01)
    print("created")
    print(await sms)
    push = asyncio.create_task(send("push", 0))
    print(await email)
    print(await push)


asyncio.run(main())
