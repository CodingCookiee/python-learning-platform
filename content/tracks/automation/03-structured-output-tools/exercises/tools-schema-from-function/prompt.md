Write `tool_from_function(fn)`, which builds a neutral tool definition from a plain Python function,
so the clinic's tools are described once, in Python.

- `name` is the function's name.
- `description` is its docstring, as `inspect.getdoc` returns it. A tool with no docstring raises
  `ValueError`: the model has nothing to go on.
- `parameters` is an object schema with a property for each parameter, and `required` listing the
  parameters that have no default, in order.

Map the type hints like this:

| Hint | Schema |
|------|--------|
| `str`, `int`, `float`, `bool` | `{"type": "string"}`, `"integer"`, `"number"`, `"boolean"` |
| `list[X]` | `{"type": "array", "items": <schema for X>}` |
| `Literal["a", "b"]` (strings) | `{"type": "string", "enum": ["a", "b"]}` |
| `X \| None` or `Optional[X]` | `{"anyOf": [<schema for X>, {"type": "null"}]}` |

A parameter without a type hint, or with a hint not in the table (a `dict`, say), raises
`TypeError` with a message that names the parameter.

```python
def find_slots(practitioner: str, day: str, duration_minutes: int = 30,
               kind: Literal["in_person", "video"] = "in_person") -> list[str]:
    """Find free appointment slots for a practitioner on a given day."""

tool_from_function(find_slots)
# {"name": "find_slots",
#  "description": "Find free appointment slots for a practitioner on a given day.",
#  "parameters": {"type": "object",
#                 "properties": {"practitioner": {"type": "string"},
#                                "day": {"type": "string"},
#                                "duration_minutes": {"type": "integer"},
#                                "kind": {"type": "string", "enum": ["in_person", "video"]}},
#                 "required": ["practitioner", "day"]}}
```

The return annotation isn't part of the schema: the model never passes it.
