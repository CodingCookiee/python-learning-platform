class RegistryMeta(type):
    """A metaclass: each root class keeps a registry of its subclasses by code, and the
    classes support len(), in, [code] and iteration over that registry."""
