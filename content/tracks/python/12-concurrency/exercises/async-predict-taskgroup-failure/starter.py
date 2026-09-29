import asyncio


async def charge(card, delay, declined=False):
    print(f"{card}: charging")
    try:
        await asyncio.sleep(delay)
    except asyncio.CancelledError:
        print(f"{card}: cancelled")
        raise
    if declined:
        raise ValueError(f"{card}: declined")
    print(f"{card}: charged")
    return card


async def main():
    try:
        async with asyncio.TaskGroup() as group:
            visa = group.create_task(charge("visa", 0.01))
            amex = group.create_task(charge("amex", 0.03, declined=True))
            group.create_task(charge("mastercard", 0.08))
            print("all started")
    except* ValueError as failures:
        print("failed:", [str(error) for error in failures.exceptions])
    print(visa.result(), amex.cancelled())
    print(visa.done(), amex.done())


asyncio.run(main())
