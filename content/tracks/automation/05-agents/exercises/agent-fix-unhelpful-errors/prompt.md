The sales research assistant keeps burning its step cap: whenever a tool fails, `run_tool` sends
back `{"error": "Tool failed"}`, and the model tries the same call again. Fix `run_tool(name,
arguments)` (and the `get_contacts` tool) so every error tells the model what to do next. The
content is always JSON `{"error": message}`:

| Problem | Message |
|---------|---------|
| `name` isn't a tool | `Unknown tool: <name>. Available tools: find_company, get_contacts.` |
| arguments the tool can't take | `<name> takes: <its parameters, comma separated>. You passed: <the argument names, comma separated>.` |
| `find_company` finds nothing | its own `CompanyNotFound` message, as it is |
| `get_contacts` is given an unknown id | `No company with id <id>. Get an id from find_company first.` |
| the CRM is down (`CrmUnavailable`) | `<name> is unavailable right now. Don't retry it; continue with what you have, or finish and say what's missing.` |
| any other exception | `<name> failed unexpectedly. Don't retry it with the same arguments.` |

Check the arguments **before** running the tool, with `inspect.signature(...).bind(...)`, so a bad
call never runs. The CRM's real error names an internal host: never send it to the model, but log
it with `logger.warning` so the team sees it. Successful calls return `json.dumps(result)` as now.

```python
run_tool("get_contacts", {"company": "Harbour Dental"})
# '{"error": "get_contacts takes: company_id, limit. You passed: company."}'
```
