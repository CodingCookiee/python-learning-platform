class PluginMeta(type):
    registry = {}

    def __new__(mcls, name, bases, namespace):
        cls = super().__new__(mcls, name, bases, namespace)
        plugin_name = namespace.get("name")
        if bases and plugin_name is not None:
            if plugin_name in mcls.registry:
                raise TypeError(f"{name}: a plugin called {plugin_name!r} already exists")
            mcls.registry[plugin_name] = cls
        return cls


class Plugin(metaclass=PluginMeta):
    """Base class for report plugins. Subclasses set name and implement run(rows)."""

    def run(self, rows):
        raise NotImplementedError


def get_plugin(name):
    """A new instance of the plugin registered under name."""
    return PluginMeta.registry[name]()


def plugin_names():
    return sorted(PluginMeta.registry)
