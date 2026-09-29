class TrackedRecord:
    """Base class for records that remember every change made to their public attributes."""

    @property
    def changes(self):
        return list(self.__dict__.get("_changes", []))

    def _record(self, name, old, new):
        self.__dict__.setdefault("_changes", []).append((name, old, new))

    def _tracked(self, name):
        return not name.startswith("_") and name in vars(self)

    def __setattr__(self, name, value):
        if self._tracked(name) and vars(self)[name] != value:
            self._record(name, vars(self)[name], value)
        super().__setattr__(name, value)

    def __delattr__(self, name):
        if self._tracked(name):
            self._record(name, vars(self)[name], None)
        super().__delattr__(name)
