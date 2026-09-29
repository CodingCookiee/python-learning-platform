class Plugin:
    """Base class for report plugins. Subclasses set name and implement run(rows)."""

    registry = {}

    def __init_subclass__(cls, **kwargs):
        super().__init_subclass__(**kwargs)
        plugin_name = vars(cls).get("name")
        if plugin_name is None:
            return
        if plugin_name in Plugin.registry:
            raise TypeError(f"{cls.__name__}: a plugin called {plugin_name!r} already exists")
        Plugin.registry[plugin_name] = cls

    def run(self, rows):
        raise NotImplementedError


def get_plugin(name):
    """A new instance of the plugin registered under name."""
    return Plugin.registry[name]()


def plugin_names():
    return sorted(Plugin.registry)
