import sys
import types


def module_from_source(name, source):
    """Create a module called name, run source in it, register it in sys.modules and return it."""
    if name in sys.modules:
        raise ValueError(f"a module called {name!r} is already loaded")
    module = types.ModuleType(name)
    sys.modules[name] = module
    try:
        exec(compile(source, f"<{name}>", "exec"), module.__dict__)
    except BaseException:
        del sys.modules[name]
        raise
    return module
