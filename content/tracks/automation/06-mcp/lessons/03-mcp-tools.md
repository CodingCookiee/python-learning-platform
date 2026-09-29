---
slug: mcp-tools
title: Tools over MCP
summary: tools/list describes each tool with a JSON Schema, tools/call runs one and returns content blocks. Validate the arguments, and report a tool that failed with isError, not a protocol error.
minutes: 50
exercises:
  - mcp-text-result
  - mcp-predict-tool-errors
  - mcp-fix-tool-error
  - mcp-tools-list-call
  - mcp-structured-results
---

In A3 a tool was three things inside your app: a neutral definition for the model, a function, and
the dispatch loop between them. MCP moves the first two into the server and leaves the loop in the
host. The host asks the server what tools it has (`tools/list`), shows those definitions to its
model, and when the model calls one, forwards the call (`tools/call`) and hands the result back to
the model. The shapes are close to A3's, and the one real difference, how failures are reported, is
where most hand-written servers go wrong.

## tools/list: definitions with a schema

`tools/list` takes no required params and returns `{"tools": [...]}`. Each tool has a `name`, a
`description` written for the model, and an `inputSchema`: the JSON Schema for its arguments,
always an object schema. It's A3's neutral definition with `parameters` renamed:

```python
from pydantic import BaseModel, Field

class GetOrder(BaseModel):
    """Look up one Kiln & Co order by its four-digit number. Returns status, carrier and total."""
    order_id: str = Field(pattern=r"^\d{4}$", description="Four-digit order number, e.g. 1042")

schema = GetOrder.model_json_schema()
schema.pop("title")
description = schema.pop("description")

{"tools": [{"name": "get_order", "description": description, "inputSchema": schema}]}
```

A tool can also carry a human-friendly `title`, an `outputSchema` (below), and `annotations`: hints
such as `{"readOnlyHint": true}` or `{"destructiveHint": true}` that help a host decide whether to
ask the user before running it. They're hints from the server, so a careful host treats them as
claims, not guarantees.

> [!NOTE]
> The list can be long, so `tools/list` supports pagination: a result may include `nextCursor`, and
> the client sends it back as `params["cursor"]` for the next page. Small servers return everything
> in one page and never send a cursor.

## tools/call: content blocks

A call names the tool and passes its arguments:

```json
{"jsonrpc": "2.0", "id": 6, "method": "tools/call",
 "params": {"name": "get_order", "arguments": {"order_id": "1042"}}}
```

The result isn't a bare value. It's a list of **content blocks**, the same idea as the content
blocks in Anthropic's messages, so a tool can return text, images or references to resources:

| Block | Shape |
|-------|-------|
| Text | `{"type": "text", "text": "..."}` |
| Image | `{"type": "image", "data": "<base64>", "mimeType": "image/png"}` |
| Resource link | `{"type": "resource_link", "uri": "policy://returns", "name": "returns"}` |
| Embedded resource | `{"type": "resource", "resource": {"uri": ..., "mimeType": ..., "text": ...}}` |

Most tools return one text block, with JSON inside when the data is structured:

```python
import json

order = {"order_id": "1042", "status": "shipped", "carrier": "DPD"}
result = {"content": [{"type": "text", "text": json.dumps(order)}], "isError": False}
result
```

The host passes the blocks to its model as the tool's result, which is why text is what matters
most: it's what the model reads.

## Two kinds of failure

This is the part to get right. A `tools/call` can fail in two very different ways:

- **Protocol errors** are problems with the request itself: a tool name the server doesn't have,
  or params with no `name`. They're JSON-RPC errors (`-32602`, invalid params), and they go to the
  host application. The model usually never sees them.
- **Tool execution errors** are the tool running and failing: order 9999 doesn't exist, the
  carrier's API timed out, the arguments don't match the schema. They're a normal **result** with
  `"isError": true` and a text block explaining what went wrong, and they go to the model, which can
  read "Order 9999 not found" and ask the customer to check the number.

It's A3's rule, "errors are results", written into the protocol. If a missing order comes back as a
JSON-RPC error, the host sees a broken server, and the model sees nothing it can use.

```python
def tool_error(message):
    return {"content": [{"type": "text", "text": message}], "isError": True}

def protocol_error(request_id, message):
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": -32602, "message": message}}

[tool_error("Order 9999 not found"), protocol_error(7, "Unknown tool: refund_order")]
```

> [!NOTE]
> Invalid arguments count as a tool execution error. The `2025-11-25` revision made that explicit:
> a model can fix a wrong argument if it's told what's wrong, so it should be told. The official SDK
> does the same.

```quiz
question: 'The model calls get_order with `{"order_id": "10423"}`, which fails the schema''s four-digit pattern. What should the server return?'
options:
  - "A JSON-RPC error, -32602 invalid params"
  - "A result with isError true and a message saying order_id must be four digits"
  - "A result with isError false and an empty content list"
answer: 1
explain: The tool exists and the request is well formed; the model just passed a bad value. Tell the model, as an isError result, so it can correct the number and try again.
```

## Validate before you run

The arguments came from a model, so they're untrusted input, exactly as in A3. The schema you
published is a promise about what the tool accepts, and the server has to keep it: the host might
not validate at all. Pydantic checks the arguments against the same model the schema came from,
and its errors make a good message for the model:

```python
from pydantic import BaseModel, Field, ValidationError

class GetOrder(BaseModel):
    order_id: str = Field(pattern=r"^\d{4}$")

def problems(error):
    return "; ".join(f"{'.'.join(map(str, e['loc']))}: {e['msg']}" for e in error.errors())

try:
    GetOrder.model_validate({"order_id": "10423"})
except ValidationError as error:
    result = {"content": [{"type": "text", "text": f"Invalid arguments: {problems(error)}"}], "isError": True}
result["content"][0]["text"]
```

The function never runs with arguments that don't match its schema. For a read-only lookup that's
tidiness; for a tool that writes, it's the difference between a model mistake and a real one.

## Structured output

Text is for the model, but a host or another program sometimes wants the data itself. Since the
`2025-06-18` revision a tool can declare an `outputSchema` in `tools/list` and return the value as
`structuredContent` alongside the text. The rule for backwards compatibility: when you return
`structuredContent`, also return the same JSON as a text block, for clients that only read text.

```python
import json

status = {"order_id": "1042", "status": "shipped", "eta": "2026-10-02"}
{"content": [{"type": "text", "text": json.dumps(status)}], "structuredContent": status, "isError": False}
```

A server that declares an `outputSchema` must return structured content that matches it, so check
your own output too. If it doesn't match, that's a bug in the server, not something the model did.

## Testing a tool server through the harness

`McpHarness.call_tool(name, arguments)` sends `tools/call` and returns the result, and it fails the
test when the reply is a protocol error, because a well-behaved client would too. For a protocol
error you expect, use `request("tools/call", {...})` and look at `["error"]`:

```python
import json
from plp_fakes import McpHarness

ORDERS = {"1042": {"status": "shipped"}}

def handle(message):
    if "id" not in message:
        return None
    method, params = message["method"], message.get("params", {})
    reply = {"jsonrpc": "2.0", "id": message["id"]}
    if method == "initialize":
        reply["result"] = {"protocolVersion": "2025-06-18", "capabilities": {"tools": {}},
                           "serverInfo": {"name": "kiln-orders", "version": "1.0.0"}}
    elif method == "tools/call" and params.get("name") == "get_order":
        order = ORDERS.get(params["arguments"].get("order_id"))
        text = json.dumps(order) if order else "Order not found"
        reply["result"] = {"content": [{"type": "text", "text": text}], "isError": order is None}
    elif method == "tools/call":
        reply["error"] = {"code": -32602, "message": f"Unknown tool: {params.get('name')}"}
    else:
        reply["error"] = {"code": -32601, "message": f"Method not found: {method}"}
    return reply

client = McpHarness(handle)
client.initialize()
[client.call_tool("get_order", {"order_id": "9999"}),
 client.request("tools/call", {"name": "refund_order", "arguments": {}})["error"]]
```

## Where this leaves you

`tools/list` returns each tool's name, description and `inputSchema` (A3's definition, renamed),
plus optional annotations and an `outputSchema`. `tools/call` returns content blocks, usually one
text block, and `structuredContent` when there's an output schema. Unknown tools are protocol
errors; everything that goes wrong once the tool is chosen, invalid arguments included, is a result
with `isError: true` the model can act on. The drills build results, predict which failure is
which, fix a server that reports them the wrong way, and build a validated tool server with
structured output.
