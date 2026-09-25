def build_url(base, **params):
    """Return base with the params that aren't None added as ?key=value&key=value."""
    pairs = [f"{key}={value}" for key, value in params.items() if value is not None]
    if not pairs:
        return base
    return base + "?" + "&".join(pairs)
