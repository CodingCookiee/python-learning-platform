---
slug: why-mcp
title: Why MCP exists
summary: One server, every AI app. Tools, resources and prompts as a standard, the host, client and server roles, capabilities, and the JSON-RPC 2.0 messages everything travels in.
minutes: 35
exercises:
  - mcp-message-kind
  - mcp-predict-json-rpc
  - mcp-validate-message
---

Kiln & Co's support team liked the triage service you built in A3. Now the operations manager uses
Claude Desktop and wants to ask it "what's the status of order 1042?", the developers want the same
lookup inside their IDE, and your A5 agent needs it too. In A3 the `get_order` tool lived inside
your own loop: its schema, its dispatch and its result format were your code, for your app. Three
apps means three integrations, and every new app means another. The Model Context Protocol (MCP)
fixes that: you write the order lookup once, as an **MCP server**, and every app that speaks MCP
can use it.

## The integration problem

Without a standard, connecting M AI apps to N systems takes M × N integrations. Each app has its own
plugin format, and each integration is written against one app's internals. MCP turns that into
M + N: each app implements the client side of the protocol once, each system gets one server, and
any client can talk to any server.

An MCP server offers three kinds of thing, and who decides to use them is what separates them:

| Primitive | What it is | Who decides to use it | Kiln & Co example |
|-----------|------------|-----------------------|-------------------|
| **Tools** | Functions the model can call, with a JSON Schema for the arguments | The model, during a conversation | `get_order`, `search_docs` |
| **Resources** | Read-only data identified by a URI, with a mime type | The application (or the user picking an attachment) | `policy://returns`, the returns policy as markdown |
| **Prompts** | Reusable message templates with arguments | The user, usually from a menu or slash command | "Draft a reply to a late-delivery complaint" |

Tools are what you already know from A3, with the schema and dispatch moved into a separate
process. Resources are closer to files: the app lists them, the user attaches one, and its text
goes into the context. Prompts are the smallest of the three.

```quiz
question: The returns policy should be available as context the user can attach in Claude Desktop, but the model shouldn't have to decide to fetch it. Which primitive fits?
options:
  - A tool, get_returns_policy()
  - A resource, policy://returns
  - A prompt, returns-policy
answer: 1
explain: Resources are application-controlled data with a URI. A tool would work too, but then the model has to choose to call it; a resource is there for the app or the user to attach directly.
```

## Hosts, clients and servers

Three roles, and the names matter because the spec uses them precisely:

- The **host** is the AI application the person uses: Claude Desktop, Claude Code, an IDE, or your
  own agent. It owns the model, the conversation and the decisions about what to show and allow.
- A **client** is the host's connection to one server. A host with three servers configured runs
  three clients, each talking to exactly one server.
- A **server** is your program. It exposes tools, resources and prompts, and knows nothing about
  the model or the conversation. It only answers requests.

That separation is the security story in one line: the server never sees the conversation, and the
host decides what the model is allowed to see and do. You'll lean on it in lesson 6.

When a client connects, both sides say what they support. These are **capabilities**: a server that
has tools says `{"tools": {}}`, one with resources adds `{"resources": {}}`, and a client might
offer `{"elicitation": {}}` (asking the user a question on the server's behalf). Neither side uses a
feature the other didn't declare. Here is what a small order-desk server declares:

```python
server_capabilities = {"tools": {}, "resources": {}}
client_capabilities = {"elicitation": {}}

def may_call(method, capabilities):
    """Can a client call this method on a server with these capabilities?"""
    family = method.split("/")[0]            # "tools/call" -> "tools"
    return family in capabilities

[may_call(m, server_capabilities) for m in ["tools/list", "resources/read", "prompts/get"]]
```

`prompts/get` is off the table: the server didn't declare prompts, so a well-behaved client never
asks.

## JSON-RPC 2.0: the envelope

Every MCP message is a JSON-RPC 2.0 message: a small JSON object with `"jsonrpc": "2.0"` and one of
three shapes.

A **request** asks for something and expects an answer. It has an `id` (a string or an integer,
chosen by the sender), a `method`, and usually `params`:

```python
request = {"jsonrpc": "2.0", "id": 7, "method": "tools/call",
           "params": {"name": "get_order", "arguments": {"order_id": "1042"}}}
```

A **response** answers one request. It carries the same `id`, which is how the client matches it to
the question it asked (several requests can be in flight at once), and exactly one of `result` or
`error`:

```python
ok = {"jsonrpc": "2.0", "id": 7, "result": {"content": [{"type": "text", "text": "Shipped with DPD"}]}}
failed = {"jsonrpc": "2.0", "id": 8, "error": {"code": -32601, "message": "Method not found: tools/run"}}
[("result" in ok, "error" in ok), ("result" in failed, "error" in failed)]
```

A **notification** is a one-way message: a `method` and maybe `params`, and **no `id`**. Nobody
answers it, not even with an error, because there's no id to answer to. MCP uses them for events:
`notifications/initialized` ("I'm ready"), `notifications/cancelled` ("stop working on request 7"),
`notifications/tools/list_changed` ("my tools changed, list them again").

```python
def kind(message):
    if "method" in message:
        return "request" if "id" in message else "notification"
    return "error" if "error" in message else "response"

messages = [
    {"jsonrpc": "2.0", "id": 1, "method": "tools/list"},
    {"jsonrpc": "2.0", "method": "notifications/initialized"},
    {"jsonrpc": "2.0", "id": 1, "result": {"tools": []}},
    {"jsonrpc": "2.0", "id": 0, "method": "ping"},
]
[kind(m) for m in messages]
```

The last one is a request: `0` is a perfectly good id. Test for the *key*, `"id" in message`, never
for a truthy value.

> [!JS]
> Coming from JavaScript: `if message.get("id"):` is the `if (msg.id)` bug. `0` is falsy in both
> languages, so a request with id 0 would be treated as a notification and never answered.

## Errors have numbers

An error object has an integer `code`, a human-readable `message`, and optionally `data` with
anything machine-readable. JSON-RPC reserves a handful of codes, and MCP uses them as they are:

| Code | Name | When |
|------|------|------|
| -32700 | Parse error | The bytes weren't valid JSON |
| -32600 | Invalid request | Valid JSON, but not a JSON-RPC request (no `method`, wrong `jsonrpc`) |
| -32601 | Method not found | The server doesn't implement that method, e.g. `prompts/list` on a tools-only server |
| -32602 | Invalid params | The method exists but the params are wrong: an unknown tool name, a missing `uri` |
| -32603 | Internal error | The server broke while handling a valid request |

Codes from -32000 to -32099 are for servers and the MCP spec to define. Any code is a *protocol*
error: something is wrong with the request or the server, and the client application sees it.
You'll meet the other kind of failure in lesson 3: a tool that ran and failed ("order 9999 doesn't
exist") is a normal result the model reads, not a JSON-RPC error.

```python
def error_response(request_id, code, message, data=None):
    error = {"code": code, "message": message}
    if data is not None:
        error["data"] = data
    return {"jsonrpc": "2.0", "id": request_id, "error": error}

error_response(3, -32602, "Unknown tool: refund_order", {"tool": "refund_order"})
```

When the request was so broken that you couldn't read its id (a parse error), the response's `id`
is `null`, which is `None` in Python.

```quiz
question: 'A client sends `{"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 12}}` and the server doesn''t support cancellation. What should the server send back?'
options:
  - "An error with code -32601, method not found"
  - "A result of {} with id 12"
  - Nothing at all
answer: 2
explain: It's a notification (no id), so it never gets a response, not even an error. The server just ignores notifications it doesn't understand.
```

## Where this leaves you

MCP turns M × N integrations into M + N by standardising three primitives: tools the model calls,
resources the app reads, and prompts the user picks. A host runs one client per server, and each
side declares its capabilities. Every message is JSON-RPC 2.0: requests with an id, responses with
the same id and a `result` or an `error`, and notifications with no id and no reply. The drills
sort messages by kind, predict a tiny dispatcher, and finish with a validator that catches the
malformed messages real clients and servers send.
