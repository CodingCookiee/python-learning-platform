EVENT_TYPES = {}


def event(name):
    """Class decorator factory: register the class in EVENT_TYPES under name."""
    ...


def parse_event(payload):
    """Build the registered event class for payload["type"] from payload["data"]."""
    ...
