Web servers write one line per request, in the "common log format":

```text
203.0.113.9 - - [25/Sep/2026:14:03:07 +0000] "GET /cart?item=42 HTTP/1.1" 200 5123
```

That's the client's IP address, two fields that are usually `-`, the time in square brackets, the
request line in quotes (method, path and protocol), the status code and the response size in bytes.
Write `parse_line(line)` that returns a dict:

```python
parse_line('203.0.113.9 - - [25/Sep/2026:14:03:07 +0000] "GET /cart?item=42 HTTP/1.1" 200 5123')
# {"ip": "203.0.113.9", "time": "25/Sep/2026:14:03:07 +0000", "method": "GET",
#  "path": "/cart?item=42", "status": 200, "size": 5123}
```

- `status` and `size` are ints. A size of `-` (no body was sent) becomes `0`.
- Some servers append more quoted fields after the size (the "combined" format). Ignore them.
- If the line isn't a log entry, return `None`.
