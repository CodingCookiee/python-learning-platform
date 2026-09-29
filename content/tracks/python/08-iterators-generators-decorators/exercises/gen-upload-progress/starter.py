def upload_batch(batch, upload):
    """Upload each record, yielding an event per record. Returns how many were uploaded."""
    ...


def upload_all(batches, upload):
    """Upload every batch, yielding progress events and a final summary."""
    ...
