def clip(text: str, limit: int = 2000) -> str:
    """The text, cut to limit characters with a note saying so."""
    if len(text) <= limit:
        return text
    return (
        text[:limit]
        + f"\n[cut: showing {limit:,} of {len(text):,} characters. Ask for less: a narrower query or the next page.]"
    )
