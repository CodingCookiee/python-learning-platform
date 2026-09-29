---
slug: mcp-handshake-and-dispatch
title: The handshake and the dispatch function
summary: A server is a function from one message to one reply. Write it by hand, negotiate the protocol version in the initialize handshake, answer every request with its own id, and never answer a notification.
minutes: 45
exercises:
  - mcp-fix-missing-id
  - mcp-fix-notification-reply
  - mcp-initialize
  - mcp-dispatcher
---

Strip away the transport and an MCP server is one function: a JSON-RPC message comes in, a reply
goes out, or nothing does. Stdio and HTTP only move those messages as bytes (lesson 4). Everything
that can go wrong in the protocol, from a missing id to a reply nobody asked for, happens inside
that function, which makes it the part worth writing by hand once and testing thoroughly. This
lesson writes it, starting with the first thing every client sends: the handshake.

## The server is a function

Here is the whole contract, as a type:

```python norun
def handle(message: dict) -> dict | None: ...
```

It returns the response to a request, or `None` for a notification. A table from method names to
functions keeps the dispatch flat:

```python
def ping(params):
    return {}

METHODS = {"ping": ping}

def handle(message):
    if "id" not in message:
        return None                                  # a notification: never answered
    function = METHODS.get(message["method"])
    if function is None:
        return {"jsonrpc": "2.0", "id": message["id"],
                "error": {"code": -32601, "message": f"Method not found: {message['method']}"}}
    return {"jsonrpc": "2.0", "id": message["id"], "result": function(message.get("params", {}))}

handle({"jsonrpc": "2.0", "id": 1, "method": "ping"}), handle({"jsonrpc": "2.0", "id": 2, "method": "tools/run"})
```

Because it's a pure function of its input, you can test it with plain calls: no process, no socket,
no event loop. The official SDK builds exactly this for you (lesson 5), but when a client
misbehaves against your server, this is the level you'll debug at.

## The initialize handshake

A client can't just start calling tools. First it has to find out which protocol version the server
speaks and what it offers. In the handshake form of the protocol, that's three messages:

1. The client sends an `initialize` **request** with the newest `protocolVersion` it supports, its
   `capabilities`, and `clientInfo` (a name and version).
2. The server answers with the `protocolVersion` it will use, its own `capabilities`, `serverInfo`,
   and optionally `instructions`: a sentence or two the host can give the model about using this
   server.
3. The client sends the `notifications/initialized` **notification**. From here on, normal requests
   flow.

```python
SERVER_INFO = {"name": "kiln-orders", "version": "1.0.0"}

def initialize(params):
    return {
        "protocolVersion": params["protocolVersion"],
        "capabilities": {"tools": {}},
        "serverInfo": SERVER_INFO,
        "instructions": "Look up Kiln & Co orders by their four-digit number.",
    }

request = {"jsonrpc": "2.0", "id": 1, "method": "initialize",
           "params": {"protocolVersion": "2025-06-18", "capabilities": {},
                      "clientInfo": {"name": "claude-desktop", "version": "1.4"}}}
{"jsonrpc": "2.0", "id": request["id"], "result": initialize(request["params"])}
```

That `initialize` blindly echoes whatever version the client asked for, which is the bug the next
section fixes.

## Protocol versions are dates

Each revision of the MCP spec is named by its release date: `2024-11-05`, `2025-03-26` (which
introduced Streamable HTTP), `2025-06-18` (structured tool output), `2025-11-25`, and `2026-07-28`.
The negotiation rule is short:

- If the server supports the version the client asked for, it **must** answer with that same
  version.
- Otherwise it answers with a version it does support, normally its newest. If the client can't
  speak that one, it disconnects.

```python
SUPPORTED = ["2025-11-25", "2025-06-18", "2025-03-26"]      # newest first

def negotiate(requested):
    return requested if requested in SUPPORTED else SUPPORTED[0]

[negotiate("2025-06-18"), negotiate("2024-11-05"), negotiate("2027-01-01")]
```

A client from next year asking for `2027-01-01` gets `2025-11-25` back and decides for itself
whether it can live with that. The server never pretends to speak a version it doesn't.

> [!NOTE]
> The `2026-07-28` revision makes MCP stateless: there's no `initialize` or
> `notifications/initialized` any more. Every request carries its protocol version and client
> capabilities in `params._meta`, and servers answer a new `server/discover` request with their
> supported versions and capabilities. The official Python SDK (v2) serves both styles, and
> clients built against the earlier revisions will be around for a long time. The drills speak the
> handshake form (`2025-06-18`), and the dispatch function you write is the same either way.

```quiz
question: A server supports 2025-11-25 and 2025-06-18. A client's initialize asks for 2025-03-26. What protocolVersion goes in the result?
options:
  - "2025-03-26, because the client asked for it"
  - "2025-11-25, the server's newest"
  - "An error: the versions don't match"
answer: 1
explain: The server can't honestly say it speaks 2025-03-26, so it offers the newest version it supports. The client decides whether to continue or disconnect; the server doesn't return an error.
```

## A client harness

The drills test your `handle` with `McpHarness` from `plp_fakes`, which plays the client's side:
`initialize()` sends the `initialize` request and then the `initialized` notification, and
`request()`, `notify()`, `list_tools()` and `call_tool()` send the rest. It numbers its requests
1, 2, 3… and checks every reply: a request must get a dict with `"jsonrpc": "2.0"` and the same id,
and a notification must get `None`.

```python
from plp_fakes import McpHarness

def handle(message):
    if "id" not in message:
        return None
    if message["method"] == "initialize":
        result = {"protocolVersion": "2025-06-18", "capabilities": {}, "serverInfo": {"name": "kiln-orders", "version": "1.0.0"}}
        return {"jsonrpc": "2.0", "id": message["id"], "result": result}
    return {"jsonrpc": "2.0", "id": message["id"], "error": {"code": -32601, "message": "Method not found"}}

client = McpHarness(handle)
client.initialize()["serverInfo"], client.request("prompts/list")["error"]["code"]
```

`.log` keeps every `(message, reply)` pair, so you can see exactly what went over the wire. Now the
same server with the most common bug in hand-written servers, a reply that forgets its id:

```python raises
from plp_fakes import McpHarness

def handle(message):
    if "id" not in message:
        return None
    return {"jsonrpc": "2.0", "result": {"protocolVersion": "2025-06-18", "capabilities": {},
                                         "serverInfo": {"name": "kiln-orders", "version": "1.0.0"}}}

McpHarness(handle).initialize()
```

A real client has several requests in flight and matches each response to its request by id. A
response without one can't be matched, so the client waits for an answer until it times out.

## Notifications get nothing back

The opposite mistake is just as common: a server that answers everything. The client sends
`notifications/initialized`, the server sends back `{"jsonrpc": "2.0", "id": null, "result": {}}`,
and a strict client drops the connection because it received a response to a request it never
made. Notifications are answered with silence, including ones you don't recognise and ones that
fail while you handle them:

```python
NOTIFICATIONS = {"notifications/initialized": lambda params: print("client is ready")}

def handle_notification(message):
    handler = NOTIFICATIONS.get(message["method"])
    if handler is not None:
        handler(message.get("params", {}))
    return None                        # always, even for methods we don't know

handle_notification({"jsonrpc": "2.0", "method": "notifications/initialized"}), \
handle_notification({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 3}})
```

> [!WARNING]
> Test for the key, `"id" in message`. `if not message.get("id"):` treats a request with id 0 as a
> notification and never answers it, and some clients start counting at 0.

## Errors from the dispatcher

With the handshake done, the dispatcher's own failures map onto the codes from lesson 1:

- a method the server doesn't implement: `-32601`, with the method in the message;
- params that aren't an object, or are missing something the method needs: `-32602`;
- an exception inside a handler: `-32603`, `"Internal error"`, and nothing more.

The last one matters. An exception's text can hold a file path, a SQL fragment or a customer's
email address. Log the details on the server, where you can read them, and send the client only the
code and a generic message:

```python
import logging
logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")
logger = logging.getLogger("kiln_mcp")

def get_order(params):
    raise KeyError("orders_2026 table missing on db-eu-2")

try:
    result = get_order({"order_id": "1042"})
except Exception:
    logger.exception("tools/call failed")
    reply = {"jsonrpc": "2.0", "id": 4, "error": {"code": -32603, "message": "Internal error"}}
reply
```

Lesson 3 separates these protocol errors from tool failures, which get a result instead.

## Where this leaves you

A server is `handle(message) -> dict | None`. Requests get a response with their own id and a
`result` or an `error`; notifications get `None`, always. The handshake is `initialize`, its
result, then `notifications/initialized`, and the server answers with the client's version when it
supports it and its own newest otherwise. Unknown methods are -32601, bad params -32602, and
crashes -32603 with the details in your logs, not the reply. The drills fix the two classic bugs,
write the handshake with version negotiation, and finish with a reusable dispatcher.
