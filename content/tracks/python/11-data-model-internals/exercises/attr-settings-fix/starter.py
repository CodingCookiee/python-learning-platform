class Settings:
    """Attribute access to a dict of settings, remembering which ones were changed."""

    def __init__(self, values):
        self._values = dict(values)
        self._changed = set()

    def __getattr__(self, name):
        return self._values[name]

    def __setattr__(self, name, value):
        if name.startswith("_"):
            setattr(self, name, value)
            return
        self._values[name] = value
        self._changed.add(name)

    def changed(self):
        """The names of the settings that were assigned, sorted."""
        return sorted(self._changed)
