import asyncio


async def fetch_profiles(client, user_ids, *, limit=5):
    """Every user's profile, in order, with at most `limit` requests in flight."""
    semaphore = asyncio.Semaphore(limit)

    async def fetch_one(user_id):
        async with semaphore:
            response = await client.get(f"/v1/users/{user_id}")
        return response.raise_for_status().json()

    return await asyncio.gather(*(fetch_one(user_id) for user_id in user_ids))
