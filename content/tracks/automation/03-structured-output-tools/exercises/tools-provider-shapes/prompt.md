Your adapters need to turn a neutral tool, `{"name", "description", "parameters"}`, into each
provider's format. Write both translations:

- `to_anthropic(tool)` returns `{"name", "description", "input_schema"}`.
- `to_openai(tool)` returns `{"type": "function", "function": {"name", "description", "parameters"}}`.

Neither may change the tool it's given: the same neutral tool list is reused on every call.

```python
FIND_SLOTS = {
    "name": "find_slots",
    "description": "Find free appointment slots for a practitioner on a given day.",
    "parameters": {"type": "object", "properties": {"day": {"type": "string"}}, "required": ["day"]},
}

to_anthropic(FIND_SLOTS)
# {"name": "find_slots", "description": "Find free appointment slots ...",
#  "input_schema": {"type": "object", "properties": {"day": {"type": "string"}}, "required": ["day"]}}

to_openai(FIND_SLOTS)
# {"type": "function", "function": {"name": "find_slots", "description": "Find free ...",
#                                   "parameters": {"type": "object", ...}}}
```
