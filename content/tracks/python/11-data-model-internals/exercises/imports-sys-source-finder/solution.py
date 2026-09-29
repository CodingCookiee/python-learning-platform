import importlib.util


class SourceFinder:
    """A meta path finder and loader for modules whose source is held in a dict."""

    def __init__(self, sources):
        self.sources = dict(sources)

    def _is_package(self, name):
        return any(other.startswith(name + ".") for other in self.sources)

    def find_spec(self, name, path, target=None):
        if name not in self.sources:
            return None
        return importlib.util.spec_from_loader(name, self, is_package=self._is_package(name))

    def create_module(self, spec):
        return None

    def exec_module(self, module):
        name = module.__name__
        exec(compile(self.sources[name], f"<{name}>", "exec"), module.__dict__)
