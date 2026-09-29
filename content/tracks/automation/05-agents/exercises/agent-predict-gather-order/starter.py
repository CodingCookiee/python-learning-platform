import asyncio

finished = []


async def draft_brief(company, pauses):
    for _ in range(pauses):
        await asyncio.sleep(0)   # waiting on the network, one turn of the event loop at a time
    finished.append(company)
    return f"brief for {company}"


async def main():
    briefs = await asyncio.gather(
        draft_brief("Harbour Dental", 3),
        draft_brief("Kiln & Co", 1),
        draft_brief("Brightline", 2),
    )
    print(briefs)
    print(finished)


asyncio.run(main())
