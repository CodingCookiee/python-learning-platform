def parse_price(text):
    """text as a float, or None if it isn't a price."""
    if text.replace(".", "").isdigit():
        return float(text)
    return None
