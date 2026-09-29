class Settings:
    """Attribute access to a dict of settings, remembering which ones were changed."""

    def __init__(self, values):
        self._values = dict(values)
        self._changed = set()

    def __getattr__(self, name):
        if name.startswith("_"):
            raise AttributeError(name)
        try:
            return self._values[name]
        except KeyError:
            raise AttributeError(f"no setting called {name!r}") from None

    def __setattr__(self, name, value):
        if name.startswith("_"):
            super().__setattr__(name, value)
            return
        self._values[name] = value
        self._changed.add(name)

    def changed(self):
        """The names of the settings that were assigned, sorted."""
        return sorted(self._changed)
