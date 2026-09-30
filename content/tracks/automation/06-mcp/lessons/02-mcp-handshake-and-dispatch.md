---
slug: mcp-handshake-and-dispatch
title: Stateless requests and the dispatch function
summary: A server is a function from one message to one reply. Every request carries its protocol version and capabilities, the server checks them each time and answers server/discover, and older clients still get the initialize handshake.
minutes: 50
exercises:
  - mcp-fix-missing-id
  - mcp-discover
  - mcp-fix-notification-reply
  - mcp-initialize
  - mcp-dispatcher
---

Strip away the transport and an MCP server is one function: a JSON-RPC message comes in, a reply
goes out, or nothing does. Stdio and HTTP only move those messages as bytes (lesson 4). Everything
that can go wrong in the protocol, from a missing id to a version the server doesn't speak, happens
inside that function, which makes it the part worth writing by hand once and testing thoroughly.

## The server is a function

Here is the whole contract, as a type:

```python norun
def handle(message: dict) -> dict | None: ...
```

It returns the response to a request, or `None` for a notification. A table from method names to
functions keeps the dispatch flat:

```python
def list_tools(params):
    return {"tools": []}

METHODS = {"tools/list": list_tools}

def handle(message):
    if "id" not in message:
        return None                                  # a notification: never answered
    function = METHODS.get(message["method"])
    if function is None:
        return {"jsonrpc": "2.0", "id": message["id"],
                "error": {"code": -32601, "message": f"Method not found: {message['method']}"}}
    return {"jsonrpc": "2.0", "id": message["id"],
            "result": {"resultType": "complete", **function(message.get("params", {}))}}

handle({"jsonrpc": "2.0", "id": 1, "method": "tools/list"}), handle({"jsonrpc": "2.0", "id": 2, "method": "tools/run"})
```

Two details are already there. Every result carries `"resultType": "complete"`: since the
`2026-07-28` revision every result says what kind it is, so a client can tell a finished answer from
an `"input_required"` one, where the server needs something from the user before it can finish.
Adding it in the envelope, once, means no method can forget it. And because `handle` is a pure
function of its input, you can test it with plain calls: no process, no socket, no event loop. The
official SDK builds exactly this for you (lesson 5), but when a client misbehaves against your
server, this is the level you'll debug at.

## Every request carries its version

In the current protocol there is no session to set up. Each request says, in its `params._meta`,
which protocol version it speaks and what the client can do:

```json
{"jsonrpc": "2.0", "id": 7, "method": "tools/list",
 "params": {"_meta": {"io.modelcontextprotocol/protocolVersion": "2026-07-28",
                      "io.modelcontextprotocol/clientCapabilities": {},
                      "io.modelcontextprotocol/clientInfo": {"name": "claude-desktop", "version": "1.9"}}}}
```

The version and the capabilities are required; `clientInfo` is recommended. The server checks them
on **every** request, independently. It must not remember them from an earlier request, because a
stdio process or an HTTP endpoint can carry requests from several conversations at once:

- A request missing a required field is malformed: `-32602`, invalid params.
- A version the server doesn't support gets `-32022`, **UnsupportedProtocolVersion**, with the
  versions it does support in `data`. The client picks one of those and retries.

```python
META = "io.modelcontextprotocol/"
SUPPORTED = ["2026-07-28"]

def check_version(message):
    """An error for a request whose _meta is missing or names a version we don't speak, else None."""
    meta = (message.get("params") or {}).get("_meta") or {}
    version = meta.get(META + "protocolVersion")
    if not isinstance(version, str) or not isinstance(meta.get(META + "clientCapabilities"), dict):
        return {"code": -32602, "message": "Invalid params: _meta needs protocolVersion and clientCapabilities"}
    if version not in SUPPORTED:
        return {"code": -32022, "message": "Unsupported protocol version",
                "data": {"supported": SUPPORTED, "requested": version}}
    return None

request = {"jsonrpc": "2.0", "id": 8, "method": "tools/list",
           "params": {"_meta": {META + "protocolVersion": "2027-03-01", META + "clientCapabilities": {}}}}
check_version(request)
```

The versions are dates: `2024-11-05`, `2025-03-26` (which introduced Streamable HTTP), `2025-06-18`
(structured tool output), `2025-11-25`, and `2026-07-28`, the current one, which made the protocol
stateless. Clients never have to guess: the error tells them what to use.

## server/discover

A client that wants to know what a server offers before using it calls `server/discover`, and every
server must implement it. The result lists the supported versions, the server's capabilities and
its identity, and can carry `instructions`, a sentence or two the host gives its model about using
this server:

```python
SERVER_INFO = {"name": "kiln-orders", "version": "1.0.0"}

def discover(params):
    return {
        "supportedVersions": SUPPORTED,
        "capabilities": {"tools": {}},
        "instructions": "Look up Kiln & Co orders by their four-digit number.",
        "_meta": {META + "serverInfo": SERVER_INFO},
        "ttlMs": 3_600_000,            # clients may cache this for an hour
        "cacheScope": "public",        # the same for every client
    }

{"resultType": "complete", **discover({})}
```

Servers should also put `serverInfo` in the `_meta` of every result, so a client knows who answered
without relying on an earlier call. `ttlMs` and `cacheScope` are caching hints the current revision
adds to discovery and to list results: how long the answer stays fresh, and whether it's the same
for everyone (`"public"`) or specific to this client (`"private"`). They're worth sending, and the
drills don't grade them.

```quiz
question: A server supports only 2026-07-28. A request's _meta says protocolVersion 2025-06-18. What does the server send back?
options:
  - "The result, answered as if the version had been 2026-07-28"
  - "Error -32022 with data.supported listing 2026-07-28, so the client can retry with it"
  - Nothing, because the client should have called server/discover first
answer: 1
explain: A version the server doesn't speak is always an UnsupportedProtocolVersion error with the supported list. Calling server/discover first is optional for clients; handling -32022 is not optional for servers.
```

## A client harness

The drills test your `handle` with `McpHarness` from `plp_fakes`, which plays the client's part.
`McpHarness(handle, protocol="2026-07-28")` speaks the current protocol: every request it sends
carries the `_meta` fields, `discover()` sends `server/discover`, and `request()`, `notify()`,
`list_tools()` and `call_tool()` send the rest. It checks every reply: a request must get a dict
with `"jsonrpc": "2.0"` and the same id, a notification must get `None`, and every result must have a
`resultType`.

```python
from plp_fakes import McpHarness

META = "io.modelcontextprotocol/"

def handle(message):
    if "id" not in message:
        return None
    if message["method"] == "server/discover":
        result = {"resultType": "complete", "supportedVersions": ["2026-07-28"], "capabilities": {},
                  "_meta": {META + "serverInfo": {"name": "kiln-orders", "version": "1.0.0"}}}
        return {"jsonrpc": "2.0", "id": message["id"], "result": result}
    return {"jsonrpc": "2.0", "id": message["id"], "error": {"code": -32601, "message": "Method not found"}}

client = McpHarness(handle, protocol="2026-07-28")
client.discover()["supportedVersions"], client.request("prompts/list")["error"]["code"]
```

`.log` keeps every `(message, reply)` pair, `request(..., id=0)` sends a custom id, and `send(raw)`
passes any message through unchecked, which is how you test the malformed ones. Now the same server
with the most common bug in hand-written servers, a reply that forgets its id:

```python raises
from plp_fakes import McpHarness

def handle(message):
    if "id" not in message:
        return None
    return {"jsonrpc": "2.0", "result": {"resultType": "complete", "supportedVersions": ["2026-07-28"], "capabilities": {}}}

McpHarness(handle, protocol="2026-07-28").discover()
```

A real client has several requests in flight and matches each response to its request by id. A
response without one can't be matched, so the client waits for an answer until it times out.

## Notifications get nothing back

The opposite mistake is just as common: a server that answers everything. The client sends
`notifications/cancelled` ("stop working on request 12"), the server sends back
`{"jsonrpc": "2.0", "id": null, "result": {}}`, and a strict client drops the connection because it
received a response to a request it never made. Notifications are answered with silence, including
ones you don't recognise and ones that fail while you handle them:

```python
cancelled = []
NOTIFICATIONS = {"notifications/cancelled": lambda params: cancelled.append(params["requestId"])}

def handle_notification(message):
    handler = NOTIFICATIONS.get(message["method"])
    if handler is not None:
        handler(message.get("params", {}))
    return None                        # always, even for methods we don't know

handle_notification({"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 12}}), \
handle_notification({"jsonrpc": "2.0", "method": "notifications/progress"}), cancelled
```

> [!WARNING]
> Test for the key, `"id" in message`. `if not message.get("id"):` treats a request with id 0 as a
> notification and never answers it, and some clients start counting at 0.

## Older clients: the initialize handshake

Clients built for `2025-11-25` and earlier don't send `_meta`. They open with a handshake instead,
and you'll meet them for a long time yet, because every host updates on its own schedule:

1. The client sends an `initialize` **request** with the newest `protocolVersion` it supports, its
   `capabilities` and `clientInfo`.
2. The server answers with the version it will use, its `capabilities`, `serverInfo` and
   optional `instructions`. If it supports the requested version it must answer with that one;
   otherwise it offers its newest older version, and the client decides whether to continue.
3. The client sends the `notifications/initialized` notification, and then plain requests without
   `_meta`, all under the version agreed in step 2.

A server that serves both eras is **dual-era**. It tells them apart by how each request arrives: a
request with the modern `_meta` is served statelessly, and an `initialize` puts that connection
into the older mode for the version it negotiated. The default `McpHarness(handle)` plays an older
client:

```python
from plp_fakes import McpHarness

LEGACY = ["2025-11-25", "2025-06-18", "2025-03-26"]      # newest first

def handle(message):
    if "id" not in message:
        return None
    if message["method"] == "initialize":
        asked = message["params"]["protocolVersion"]
        result = {"resultType": "complete", "protocolVersion": asked if asked in LEGACY else LEGACY[0],
                  "capabilities": {"tools": {}}, "serverInfo": {"name": "kiln-orders", "version": "1.0.0"}}
        return {"jsonrpc": "2.0", "id": message["id"], "result": result}
    return {"jsonrpc": "2.0", "id": message["id"], "error": {"code": -32601, "message": "Method not found"}}

old_client = McpHarness(handle)                  # protocol 2025-06-18: initialize, then initialized
[old_client.initialize()["protocolVersion"], McpHarness(handle).initialize("2024-11-05")["protocolVersion"]]
```

Older clients ignore the `resultType` they don't know about, so one envelope serves both. A server
that only speaks the current protocol should still answer `initialize` with an error that names the
versions it supports: an older client has no way to move forward, so that message may be the only
thing its user sees.

## Errors from the dispatcher

With the version checked, the dispatcher's own failures map onto the codes from lesson 1:

- a method the server doesn't implement: `-32601`, with the method in the message;
- params that aren't an object, or are missing something the method needs, `_meta` included:
  `-32602`;
- a version the server doesn't speak: `-32022`, with `supported` and `requested` in `data`;
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

A server is `handle(message) -> dict | None`. Every request carries its protocol version and client
capabilities in `params._meta`, and the server checks them each time: missing is -32602, unsupported
is -32022 with the supported list. `server/discover` returns the versions, capabilities and
identity, and every result says `"resultType": "complete"`. Notifications get `None`, always. Older
clients open with `initialize` and `notifications/initialized` instead, and a dual-era server serves
both. The drills fix a missing id, build `server/discover` with version checking, fix a server that
answers notifications, add the handshake for older clients, and finish with a reusable dispatcher.
