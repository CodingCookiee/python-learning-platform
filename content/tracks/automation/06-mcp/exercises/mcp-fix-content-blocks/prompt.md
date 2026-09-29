Your agent's MCP bridge turns each `tools/call` result into the text of a tool message with
`result["content"][0]["text"]`. It worked with the order server. Then the team connected the wiki
server, whose `search_docs` returns several text blocks and sometimes a `resource_link` first, and
the agent started crashing with `KeyError: 'text'`, answering from half the results, and treating
failed calls as successes.

Fix `result_to_text(result)` so it turns the whole result into one string:

| Block type | Becomes |
|------------|---------|
| `text` | its `text` |
| `image` or `audio` | `[image: <mimeType>]` or `[audio: <mimeType>]` |
| `resource_link` | `[resource: <uri>]` |
| `resource` (embedded) | the embedded resource's `text`, or `[resource: <uri>]` if it has none |
| anything else | `[<type> content]` |

- Join the blocks' strings with `"\n"`, in order.
- If `content` is empty or missing, use `json.dumps(result["structuredContent"])` when there is
  one, and `""` otherwise.
- If `isError` is true, return `json.dumps({"error": <the text>})`, the same shape your loop sends
  for any failed tool.

```python
result_to_text({"content": [{"type": "text", "text": "Returns: 30 days."},
                            {"type": "resource_link", "uri": "policy://returns", "name": "returns"}]})
# "Returns: 30 days.\n[resource: policy://returns]"
```
