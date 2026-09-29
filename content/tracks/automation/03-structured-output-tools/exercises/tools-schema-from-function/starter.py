import inspect
import types
from typing import Literal, Union, get_args, get_origin, get_type_hints


def tool_from_function(fn):
    """A neutral tool definition (name, description, parameters) built from fn's signature."""
    return {"name": fn.__name__, "description": fn.__doc__, "parameters": {"type": "object", "properties": {}}}
