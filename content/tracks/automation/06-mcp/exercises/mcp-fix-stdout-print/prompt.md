The wiki server's unit tests pass: `handle` returns the right replies. But when Claude Desktop starts
it with `uv run wiki_server.py`, the connection fails with "Unexpected token 'k', "kiln-wiki "... is
not valid JSON", and reading a page fails the same way.

Fix the server so that, when `serve` runs, **stdout carries only JSON-RPC messages**. Keep the two
diagnostic messages, but send them through the starter's `logger` at `INFO` level instead:
`kiln-wiki MCP server ready` when `serve` starts, and `reading <uri>` for each read.

```python
with contextlib.redirect_stdout(io.StringIO()) as out:
    serve(handle, stdin=io.StringIO(INITIALIZE + "\n" + READ_RETURNS + "\n"))
[json.loads(line)["id"] for line in out.getvalue().splitlines()]    # [1, 2]
```
