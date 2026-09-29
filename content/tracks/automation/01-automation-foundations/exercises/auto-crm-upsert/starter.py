import time

import httpx


def upsert_contact(client, base_id, lead, *, sleep=time.sleep):
    """Create or update the Contacts record for lead's email; return (record_id, "created" | "updated")."""
    ...
