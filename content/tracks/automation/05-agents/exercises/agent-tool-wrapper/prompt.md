Every tool the research agent gets needs the same care: check the arguments, turn errors into
messages the model can act on, serialise the result and keep it small. Write it once, as a
decorator:

```python
@agent_tool(max_chars=2000)
def get_account_notes(account_id: str, limit: int = 5): ...
```

The decorated function keeps its name and docstring (`functools.wraps`), takes keyword arguments
only, and **always returns a string**, never raises:

- Arguments the function can't take (checked with `inspect.signature(fn).bind`, before it runs)
  return `{"error": "get_account_notes takes account_id, limit (optional). You passed: account."}`
  as JSON. Parameters with a default are marked ` (optional)`.
- A `ToolError` (from the starter) is written for the model: return `{"error": str(error)}`.
- Any other exception returns `{"error": "<name> failed unexpectedly. Don't retry it with the same
  arguments."}`, and is logged with `logger.warning`, naming the tool.
- A result that's already a `str` is used as it is; anything else becomes `json.dumps(result,
  default=str)`.
- Whatever comes back is clipped to `max_chars` with `clip` from the starter.

```python
get_account_notes(account_id="C-301", limit=1)   # '[{"date": "2026-09-12", "text": "Wants SSO before renewal."}]'
get_account_notes(account="C-301")               # '{"error": "get_account_notes takes account_id, limit (optional). You passed: account."}'
```
