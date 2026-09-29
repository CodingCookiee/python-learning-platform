def parse_quantity(text: str) -> int:
    """ " 3 " -> 3 """
    return text.strip()


def line_label(sku: str, quantity: int) -> str:
    """("MUG-01", 3) -> "MUG-01 x3" """
    return sku + " x" + quantity


def shipping_band(weight_grams: int) -> str:
    """Up to 2 kg is small, up to 10 kg is medium, anything heavier is large."""
    if weight_grams <= 2000:
        return "small"
    elif weight_grams <= 10000:
        return "medium"
