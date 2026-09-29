import types


def kind_of(value):
    """Describe value as "class", "function", "module" or "instance of <TypeName>"."""
    if isinstance(value, type):
        return "class"
    if isinstance(value, (types.FunctionType, types.BuiltinFunctionType)):
        return "function"
    if isinstance(value, types.ModuleType):
        return "module"
    return f"instance of {type(value).__name__}"
