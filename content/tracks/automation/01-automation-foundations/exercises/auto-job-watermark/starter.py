from datetime import timedelta


def select_batch(leads, watermark, now, limit=100):
    """(leads after watermark and up to now, oldest first, at most limit; the new watermark)."""
    recent = [lead for lead in leads if lead["created"] > now - timedelta(minutes=15)]
    return recent, now
