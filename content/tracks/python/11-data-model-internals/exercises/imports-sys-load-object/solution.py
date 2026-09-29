import importlib


def load_object(spec):
    """Import and return the object named by "package.module:attribute.path"."""
    module_name, colon, attribute_path = spec.partition(":")
    if not colon or not module_name or not attribute_path or ":" in attribute_path:
        raise ValueError(f"expected 'module:attribute', got {spec!r}")
    obj = importlib.import_module(module_name)
    for name in attribute_path.split("."):
        obj = getattr(obj, name)
    return obj
