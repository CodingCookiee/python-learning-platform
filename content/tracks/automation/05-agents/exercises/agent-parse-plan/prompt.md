The planner replies with a numbered plan, often with a sentence before or after it. Write
`parse_plan(text)`, which returns the steps as a list of strings:

- A step is a line that starts with a number followed by `.` or `)` and a space (leading spaces
  are fine), such as `1. Look up the account` or `2) List open tickets`.
- The step's text is what follows, with surrounding whitespace stripped.
- Every other line is ignored. No steps at all gives `[]`.

```python
parse_plan("Here's my plan:\n1. Look up account C-301\n2. List its open tickets\n\nLet me know if that works.")
# ["Look up account C-301", "List its open tickets"]
```
