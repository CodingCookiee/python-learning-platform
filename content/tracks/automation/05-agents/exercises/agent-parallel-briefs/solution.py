import asyncio

BRIEF_SYSTEM = "You write two-line pre-call briefs for Northwind's sales team, from what you know of the account."


async def brief_accounts(llm, companies: list[str], *, limit: int = 3) -> list[str | None]:
    """A brief for every company, with at most limit calls in flight, in the input order."""
    gate = asyncio.Semaphore(limit)

    async def one(company: str) -> str | None:
        async with gate:
            try:
                response = await llm.complete(
                    [{"role": "user", "content": f"Write a two-line pre-call brief for {company}."}],
                    system=BRIEF_SYSTEM,
                )
            except Exception:
                return None
        return response.text

    return await asyncio.gather(*(one(company) for company in companies))
