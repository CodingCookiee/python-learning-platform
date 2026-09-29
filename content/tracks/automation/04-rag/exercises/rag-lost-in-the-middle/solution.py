def order_for_context(ranked):
    """Chunks reordered so the strongest are at the start and the end of the context."""
    return ranked[0::2] + ranked[1::2][::-1]
