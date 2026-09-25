An uptime dashboard shows a label next to each HTTP status code. Write `status_label(code)` with a
`match` statement:

| Code | Label |
|------|-------|
| 200 | `"OK"` |
| 201 | `"Created"` |
| 404 | `"Not found"` |
| 500, 502 or 503 | `"Server error"` |
| anything else | `"Unknown"` |

```python
status_label(404)   # "Not found"
status_label(502)   # "Server error"
```
