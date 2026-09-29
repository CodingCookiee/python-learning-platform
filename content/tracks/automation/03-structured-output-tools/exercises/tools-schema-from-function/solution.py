import inspect
import types
from typing import Any, Callable, Literal, Union, get_args, get_origin, get_type_hints

SIMPLE = {str: "string", int: "integer", float: "number", bool: "boolean"}


def json_type(hint: Any, parameter: str) -> dict:
    """The JSON schema for one type hint."""
    if hint in SIMPLE:
        return {"type": SIMPLE[hint]}
    origin, args = get_origin(hint), get_args(hint)
    if origin is list and len(args) == 1:
        return {"type": "array", "items": json_type(args[0], parameter)}
    if origin is Literal and all(isinstance(value, str) for value in args):
        return {"type": "string", "enum": list(args)}
    if origin in (Union, types.UnionType):
        others = [arg for arg in args if arg is not type(None)]
        if len(others) == 1 and len(args) == 2:
            return {"anyOf": [json_type(others[0], parameter), {"type": "null"}]}
    raise TypeError(f"Parameter {parameter!r} has a type tools can't describe: {hint!r}")


def tool_from_function(fn: Callable) -> dict:
    """A neutral tool definition (name, description, parameters) built from fn's signature."""
    description = inspect.getdoc(fn)
    if not description:
        raise ValueError(f"{fn.__name__} needs a docstring: it's the tool's description")
    hints = get_type_hints(fn)
    properties, required = {}, []
    for name, parameter in inspect.signature(fn).parameters.items():
        if name not in hints:
            raise TypeError(f"Parameter {name!r} of {fn.__name__} has no type hint")
        properties[name] = json_type(hints[name], name)
        if parameter.default is inspect.Parameter.empty:
            required.append(name)
    return {
        "name": fn.__name__,
        "description": description,
        "parameters": {"type": "object", "properties": properties, "required": required},
    }
