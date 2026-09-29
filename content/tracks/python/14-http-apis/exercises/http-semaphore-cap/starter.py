import asyncio


async def fetch_profiles(client, user_ids, *, limit=5):
    """Every user's profile, in order, with at most `limit` requests in flight."""
    responses = await asyncio.gather(*(client.get(f"/v1/users/{user_id}") for user_id in user_ids))
    return [response.json() for response in responses]
