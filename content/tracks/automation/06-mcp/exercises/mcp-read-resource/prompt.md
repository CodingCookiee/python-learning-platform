Kiln & Co's staff wiki is becoming an MCP server so the support team can attach its pages in Claude
Desktop. The starter has the data, a `match_template` helper, and a `handle` that does the JSON-RPC
part. Write the three functions it calls:

**`list_resources() -> dict`**: `{"resources": [...]}`, one entry per item in `DOCS`, in order, with
`uri`, `name`, `title`, `mimeType` and `size` (the content's length in bytes, so text is measured
after encoding it as UTF-8).

**`list_templates() -> dict`**: `{"resourceTemplates": [PERSON_TEMPLATE]}`.

**`read_resource(params) -> dict`**: the `resources/read` result for `params["uri"]`:

- a URI in `DOCS`: `{"contents": [item]}`, where `item` has the `uri`, the `mimeType`, and either
  `text` (for a `str`) or `blob` (for `bytes`, base64-encoded as an ASCII string);
- a URI matching `PERSON_TEMPLATE` for a handle in `PEOPLE`: one text item, `text/markdown`, whose
  text is `person_page(PEOPLE[handle])`;
- a missing or non-string `uri`: raise `InvalidParams("uri is required")`;
- anything else: raise `ResourceNotFound(uri)`. `handle` turns it into `-32602` with the URI in
  `data`.

```python
client = McpHarness(handle)
client.initialize()
client.read_resource("policy://returns")
# {"contents": [{"uri": "policy://returns", "mimeType": "text/markdown",
#                "text": "# Returns\n\nUnused items can be returned within 30 days of delivery."}]}
```
