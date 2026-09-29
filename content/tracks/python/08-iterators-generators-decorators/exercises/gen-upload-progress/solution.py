def upload_batch(batch, upload):
    """Upload each record, yielding an event per record. Returns how many were uploaded."""
    uploaded = 0
    for record in batch:
        if upload(record):
            uploaded += 1
            yield "uploaded", record["id"]
        else:
            yield "failed", record["id"]
    return uploaded


def upload_all(batches, upload):
    """Upload every batch, yielding progress events and a final summary."""
    total = total_uploaded = 0
    for number, batch in enumerate(batches, start=1):
        yield "batch", number, len(batch)
        uploaded = yield from upload_batch(batch, upload)
        yield "batch_done", number, uploaded
        total += len(batch)
        total_uploaded += uploaded
    yield "summary", total_uploaded, total
