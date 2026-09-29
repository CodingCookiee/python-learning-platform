Before a tool list ships, run it through a linter. Write `lint_tools(tools)`, which takes a list of
neutral tool definitions and returns a list of problems as strings, `"<tool name>: <problem>"`, in
the order of the tools and, within a tool, the order of the rules below. A clean list gives `[]`.

1. The name is snake_case with at least two words, like `get_order` (lowercase letters and digits,
   words joined by single underscores, starting with a letter): `name should be verb_noun snake_case`.
2. The description is at least 40 characters long: `description is too short to tell the model when to use it`.
3. Every parameter has a non-empty `description`: `parameter <param> has no description`.
4. Parameters named `payload`, `data`, `json` or `options` of type string suggest JSON crammed into
   a string: `parameter <param> looks like JSON in a string; use typed parameters`.
5. A name used by an earlier tool in the list: `duplicate tool name`.

```python
tools = [
    {"name": "orders", "description": "Orders API",
     "parameters": {"type": "object", "properties": {"q": {"type": "string"}}}},
]
lint_tools(tools)
# ["orders: name should be verb_noun snake_case",
#  "orders: description is too short to tell the model when to use it",
#  "orders: parameter q has no description"]
```
