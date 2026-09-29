class cached_attribute:
    """Decorator: compute the attribute on first read, then store it on the instance."""

    def __init__(self, func):
        self.func = func
