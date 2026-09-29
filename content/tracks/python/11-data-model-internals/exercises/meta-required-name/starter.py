class Command:
    """Base class for chat commands. Every subclass must have a non-empty str name."""

    def run(self, text):
        raise NotImplementedError
