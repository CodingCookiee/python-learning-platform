def make_record(name, fields):
    """Build and return a record class called name with these fields, using type()."""
    fields = tuple(fields)

    def __init__(self, *args, **kwargs):
        if len(args) > len(fields):
            raise TypeError(f"{name} takes {len(fields)} fields, got {len(args)}")
        values = dict(zip(fields, args))
        for field, value in kwargs.items():
            if field not in fields:
                raise TypeError(f"{name} has no field {field!r}")
            if field in values:
                raise TypeError(f"{name} got {field!r} twice")
            values[field] = value
        missing = [field for field in fields if field not in values]
        if missing:
            raise TypeError(f"{name} is missing {', '.join(missing)}")
        for field in fields:
            setattr(self, field, values[field])

    def __repr__(self):
        shown = ", ".join(f"{field}={getattr(self, field)!r}" for field in fields)
        return f"{name}({shown})"

    def __eq__(self, other):
        if type(other) is not type(self):
            return NotImplemented
        return all(getattr(self, field) == getattr(other, field) for field in fields)

    namespace = {"fields": fields, "__init__": __init__, "__repr__": __repr__, "__eq__": __eq__}
    return type(name, (), namespace)
