def unique_emails(emails):
    """Return emails without duplicates (ignoring case and spaces), first spelling kept, in order."""
    seen = set()
    unique = []
    for email in emails:
        key = email.strip().lower()
        if key not in seen:
            seen.add(key)
            unique.append(email)
    return unique
