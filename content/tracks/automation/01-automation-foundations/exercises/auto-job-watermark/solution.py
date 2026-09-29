from datetime import timedelta


def select_batch(leads, watermark, now, limit=100):
    """(leads after watermark and up to now, oldest first, at most limit; the new watermark)."""
    pending = sorted(
        (lead for lead in leads if (watermark is None or lead["created"] > watermark) and lead["created"] <= now),
        key=lambda lead: lead["created"],
    )
    batch = pending[:limit]
    new_watermark = batch[-1]["created"] if batch else watermark
    return batch, new_watermark
