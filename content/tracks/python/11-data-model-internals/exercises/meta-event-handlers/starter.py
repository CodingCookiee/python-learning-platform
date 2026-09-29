class EventHandler:
    """Base class for webhook handlers. Subclasses register themselves by event name."""

    handlers = {}

    def handle(self, data):
        raise NotImplementedError


def dispatch(payload):
    """Run the registered handler for payload["type"] on payload["data"]."""
    ...
