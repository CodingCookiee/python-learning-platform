class EventHandler:
    """Base class for webhook handlers. Subclasses register themselves by event name."""

    handlers = {}

    def __init_subclass__(cls, event=None, abstract=False, **kwargs):
        super().__init_subclass__(**kwargs)
        if abstract:
            return
        if event is None:
            raise TypeError(f"{cls.__name__} needs an event, or abstract=True")
        if event in EventHandler.handlers:
            owner = EventHandler.handlers[event].__name__
            raise TypeError(f"{cls.__name__}: {event!r} is already handled by {owner}")
        cls.event = event
        EventHandler.handlers[event] = cls

    def handle(self, data):
        raise NotImplementedError


def dispatch(payload):
    """Run the registered handler for payload["type"] on payload["data"]."""
    try:
        handler_class = EventHandler.handlers[payload["type"]]
    except KeyError:
        raise ValueError(f"no handler for {payload['type']!r}") from None
    return handler_class().handle(payload["data"])
