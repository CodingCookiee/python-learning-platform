class Command:
    """Base class for chat commands. Every subclass must have a non-empty str name."""

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        name = getattr(cls, "name", None)
        if not isinstance(name, str) or not name:
            raise TypeError(f"{cls.__name__} must define a name")

    def run(self, text):
        raise NotImplementedError
