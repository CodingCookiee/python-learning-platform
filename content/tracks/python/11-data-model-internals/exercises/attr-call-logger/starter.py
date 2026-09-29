class CallLogger:
    """Stand in for target, recording every method call made through it in self.calls."""

    def __init__(self, target):
        self.target = target
        self.calls = []
