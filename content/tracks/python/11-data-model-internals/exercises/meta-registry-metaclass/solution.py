class RegistryMeta(type):
    """A metaclass: each root class keeps a registry of its subclasses by code, and the
    classes support len(), in, [code] and iteration over that registry."""

    def __new__(mcls, name, bases, namespace, **kwargs):
        cls = super().__new__(mcls, name, bases, namespace, **kwargs)
        if not any(isinstance(base, RegistryMeta) for base in bases):
            cls._registry = {}
        elif "code" in namespace:
            code = namespace["code"]
            if code in cls._registry:
                taken_by = cls._registry[code].__name__
                raise TypeError(f"{name}: code {code!r} is already used by {taken_by}")
            cls._registry[code] = cls
        return cls

    def __len__(cls):
        return len(cls._registry)

    def __iter__(cls):
        return iter(cls._registry.values())

    def __contains__(cls, code):
        return code in cls._registry

    def __getitem__(cls, code):
        return cls._registry[code]
