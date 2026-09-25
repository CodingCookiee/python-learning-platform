def unique_emails(emails):
    """Return emails without duplicates (ignoring case and spaces), first spelling kept, in order."""
    unique = []
    for email in emails:
        normalised_so_far = []
        for kept in unique:
            normalised_so_far.append(kept.strip().lower())
        if email.strip().lower() not in normalised_so_far:
            unique.append(email)
    return unique
