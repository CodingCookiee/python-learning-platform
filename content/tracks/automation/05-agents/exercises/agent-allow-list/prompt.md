Brightline runs one agent codebase for several jobs, and each job should see only its own tools.
Write `scope_tools(tools, registry, allow)`:

- `tools` is the list of neutral tool definitions, `registry` maps tool names to functions, and
  `allow` is a set of tool names.
- Return `(definitions, scoped_registry)`: the definitions whose name is in `allow`, in their
  original order, and a new registry with only those names.
- A name in `allow` that isn't one of the tools is a configuration mistake: raise `ValueError`
  naming it.
- Don't change the lists or dicts you're given.

```python
definitions, registry = scope_tools(TOOLS, REGISTRY, {"list_overdue", "get_invoice"})
[t["name"] for t in definitions]   # ["get_invoice", "list_overdue"]
sorted(registry)                   # ["get_invoice", "list_overdue"]
```
