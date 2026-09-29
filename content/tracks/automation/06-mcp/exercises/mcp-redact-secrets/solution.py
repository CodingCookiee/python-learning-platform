def redact(text: str, secrets: list[str | None]) -> str:
    """text with every known secret replaced by [redacted]."""
    for secret in sorted((s for s in secrets if s), key=len, reverse=True):
        text = text.replace(secret, "[redacted]")
    return text
