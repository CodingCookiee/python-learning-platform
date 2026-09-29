def post_batch(ledger, entries):
    """Lock the ledger, post every entry, always unlock it, and return how many were posted."""
    ledger.lock()
    posted = 0
    try:
        for entry in entries:
            ledger.post(entry)
            posted += 1
    finally:
        ledger.unlock()
    return posted
