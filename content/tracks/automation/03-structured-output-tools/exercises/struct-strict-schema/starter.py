def strict_schema(schema):
    """A copy of schema where every object forbids extra properties and requires all of its properties."""
    strict = dict(schema)
    strict["additionalProperties"] = False
    return strict
