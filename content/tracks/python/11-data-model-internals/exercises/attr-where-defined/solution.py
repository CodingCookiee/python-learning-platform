def where_defined(obj, name):
    """"instance", the name of the class in the MRO that holds name, or None."""
    if name in getattr(obj, "__dict__", {}):
        return "instance"
    for cls in type(obj).__mro__:
        if name in vars(cls):
            return cls.__name__
    return None
