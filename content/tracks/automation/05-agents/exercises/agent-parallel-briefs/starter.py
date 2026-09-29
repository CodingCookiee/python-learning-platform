import asyncio

BRIEF_SYSTEM = "You write two-line pre-call briefs for Northwind's sales team, from what you know of the account."


async def brief_accounts(llm, companies, *, limit=3):
    """A brief for every company, with at most limit calls in flight, in the input order."""
    briefs = []
    for company in companies:
        response = await llm.complete([{"role": "user", "content": f"Write a two-line pre-call brief for {company}."}],
                                      system=BRIEF_SYSTEM)
        briefs.append(response.text)
    return briefs
