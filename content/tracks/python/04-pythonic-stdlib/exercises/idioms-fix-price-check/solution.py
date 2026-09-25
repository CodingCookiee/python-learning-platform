def parse_price(text):
    """text as a float, or None if it isn't a price."""
    try:
        return float(text)
    except ValueError:
        return None
