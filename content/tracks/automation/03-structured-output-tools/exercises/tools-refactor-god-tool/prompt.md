The sales assistant has one tool, `crm(action, payload)`, where `payload` is a JSON string whose
shape depends on `action`. The model gets it wrong constantly: it sends `"stage": "Won"` instead of
`"won"`, forgets fields, and escapes the nested JSON badly.

Split it into three focused tools. Keep the behaviour of each action exactly as it is now.

| Tool | Parameters | Does |
|------|------------|------|
| `find_contact` | `email` (string) | what `action="find_contact"` does |
| `add_note` | `contact_id` (string), `text` (string) | what `action="add_note"` does |
| `set_deal_stage` | `deal_id` (string), `stage` (one of `STAGES`, as an enum) | what `action="set_stage"` does |

- `TOOLS` is the list of the three neutral tool definitions, in that order. Every parameter has a
  description, all of them are required, and no tool takes a JSON string.
- `REGISTRY` maps each tool name to its Python function, which takes those parameters as keyword
  arguments.
- The `crm` function and its tool are gone.

```python
REGISTRY["find_contact"](email="ada@northwind.example")   # {"contact_id": "C-301", "name": "Ada Park"}
REGISTRY["set_deal_stage"](deal_id="D-77", stage="won")   # {"deal_id": "D-77", "stage": "won"}
[tool["name"] for tool in TOOLS]                          # ["find_contact", "add_note", "set_deal_stage"]
```
