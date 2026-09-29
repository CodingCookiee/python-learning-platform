EVENT_TYPES = {}


def event(name):
    """Class decorator factory: register the class in EVENT_TYPES under name."""

    def register(cls):
        if name in EVENT_TYPES:
            raise ValueError(f"{name} is already registered to {EVENT_TYPES[name].__name__}")
        cls.event_name = name
        EVENT_TYPES[name] = cls
        return cls

    return register


def parse_event(payload):
    """Build the registered event class for payload["type"] from payload["data"]."""
    cls = EVENT_TYPES.get(payload["type"])
    if cls is None:
        raise ValueError(f"unknown event type: {payload['type']}")
    return cls(**payload["data"])
