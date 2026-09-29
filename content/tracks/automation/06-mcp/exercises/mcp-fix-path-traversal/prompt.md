Kiln & Co's handbook server serves the markdown files in its handbook folder as resources:
`handbook://returns.md` is `<root>/returns.md`, and `handbook://teams/warehouse.md` is
`<root>/teams/warehouse.md`. A security review found that `handbook://../secrets.env` returns the
server's environment file, API tokens and all.

Fix `HandbookServer.read_resource` so it only ever serves **markdown files inside the root folder**:

- the URI's path is percent-decoded first (`%2e%2e%2f` is `../`), as the starter already does;
- the file must be inside the root after resolving `..`, absolute paths and symlinks;
- it must be an existing file (not a folder) with the `.md` suffix.

Anything else raises `ResourceNotFound(uri)`, which `handle` reports as `-32602`, exactly like a page
that doesn't exist, so the reply doesn't reveal which files exist outside the handbook.

```python
server = HandbookServer(root)            # root holds returns.md; secrets.env sits next to root
client = McpHarness(server.handle)
client.initialize()
client.read_resource("handbook://returns.md")["contents"][0]["text"]     # "# Returns\n\n30 days."
client.request("resources/read", {"uri": "handbook://../secrets.env"})["error"]["code"]   # -32602
```
