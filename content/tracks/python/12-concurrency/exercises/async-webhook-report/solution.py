import asyncio


async def deliver_all(client, webhooks):
    """Post to every webhook at once and report {"delivered": [...], "failed": {...}}."""
    outcomes = await asyncio.gather(
        *(client.post(webhook["url"]) for webhook in webhooks), return_exceptions=True
    )
    report = {"delivered": [], "failed": {}}
    for webhook, outcome in zip(webhooks, outcomes):
        if isinstance(outcome, Exception):
            report["failed"][webhook["id"]] = f"{type(outcome).__name__}: {outcome}"
        elif 200 <= outcome < 300:
            report["delivered"].append(webhook["id"])
        else:
            report["failed"][webhook["id"]] = f"HTTP {outcome}"
    return report
