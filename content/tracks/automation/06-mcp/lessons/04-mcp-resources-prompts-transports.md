---
slug: mcp-resources-prompts-transports
title: Resources, prompts and transports
summary: Resources are documents with URIs and mime types, templates cover whole families of them, and prompts are reusable messages. Then the two transports that carry every message, and the stdout rule that breaks stdio servers.
minutes: 45
exercises:
  - mcp-match-uri-template
  - mcp-read-resource
  - mcp-fix-stdout-print
  - mcp-stdio-loop
---

Kiln & Co's staff wiki has a returns policy, a shipping policy and a page for every member of
staff. The support team wants to attach the returns policy to a conversation in Claude Desktop
without the model having to go looking for it. That's what resources are for: named, read-only
documents the application lists and the user picks. This lesson adds them to your server, covers
prompts briefly, and then looks under the dispatch function at the transports that carry every
message.

## Listing and reading resources

A resource has a **URI**, which is its identity, and a **mime type**, which tells the host how to
treat its content. The URI scheme is up to you: `policy://returns` and `wiki://people/ada` are fine,
and so are `file:///srv/handbook/returns.md` or an `https://` URL when that's what the data really is.

`resources/list` returns what's available:

```python
DOCS = {
    "policy://returns": {"name": "returns", "title": "Returns policy", "mimeType": "text/markdown",
                         "text": "# Returns\n\nUnused items can be returned within 30 days."},
    "policy://shipping": {"name": "shipping", "title": "Shipping policy", "mimeType": "text/markdown",
                          "text": "# Shipping\n\nOrders ship within two working days."},
}

def list_resources(params):
    return {"resources": [{"uri": uri, "name": d["name"], "title": d["title"], "mimeType": d["mimeType"]}
                          for uri, d in DOCS.items()]}

list_resources({})
```

`resources/read` takes a `uri` and returns `contents`, a list, because one URI can stand for several
pieces (a folder, for instance). Each item repeats its `uri` and carries either `text` or `blob`
(base64-encoded bytes, for a PDF or an image):

```python
DOCS = {"policy://returns": {"mimeType": "text/markdown",
                             "text": "# Returns\n\nUnused items can be returned within 30 days."}}

def read_resource(params):
    doc = DOCS[params["uri"]]
    return {"contents": [{"uri": params["uri"], "mimeType": doc["mimeType"], "text": doc["text"]}]}

read_resource({"uri": "policy://returns"})
```

A server with resources declares `{"resources": {}}` in its capabilities, and adds
`{"listChanged": true}` if it will tell clients when the list changes (in the current revision,
clients opt in to such notifications with one long-lived `subscriptions/listen` request). Like
`tools/list`, the list and read results can carry the `ttlMs` and `cacheScope` caching hints: a
policy document that changes once a quarter can safely say `"ttlMs": 3600000`.

## Templates and missing resources

Listing a page per member of staff, or an invoice per order, doesn't scale. A **resource template**
describes a whole family with an RFC 6570 URI template, listed by `resources/templates/list`:

```json
{"resourceTemplates": [{"uriTemplate": "wiki://people/{handle}", "name": "person",
                        "title": "Staff profile", "mimeType": "text/markdown"}]}
```

The client fills in the variables and reads the resulting URI with the ordinary `resources/read`.
Your server has to match it back to the template. For simple `{name}` variables, each one matches a
run of characters without a `/`:

```python
import re

def template_regex(template):
    pattern = re.sub(r"\\\{(\w+)\\\}", r"(?P<\1>[^/]+)", re.escape(template))
    return re.compile(pattern + r"\Z")

people = template_regex("wiki://people/{handle}")
[m.groupdict() if (m := people.match(uri)) else None
 for uri in ["wiki://people/ada", "wiki://people/ada/photo", "wiki://teams/ops"]]
```

A URI that matches nothing, or names a document that doesn't exist, is a protocol error: `-32602`
with the URI in `data`, so the client can show which one was missing.

```python
def not_found(request_id, uri):
    return {"jsonrpc": "2.0", "id": request_id,
            "error": {"code": -32602, "message": f"Resource not found: {uri}", "data": {"uri": uri}}}

not_found(12, "policy://refunds")
```

> [!NOTE]
> Revisions before `2026-07-28` suggested a custom code, `-32002`, for a missing resource. The
> current spec uses `-32602`, and clients treat either as "not found".

```quiz
question: Why is a missing resource a protocol error, when a missing order in get_order is an isError result?
options:
  - Resources can't return isError, so there's no other way to report it
  - The client asked for the URI itself, so the problem goes to the client; a tool result goes to the model
  - A missing resource is a server crash
answer: 1
explain: Resources are read by the application, not the model, so the error goes to the application that asked. A tool's result is for the model, which can react to "Order 9999 not found".
```

## Prompts, briefly

Prompts are reusable message templates that a user picks, typically from a slash-command menu:
"Draft a reply to a late-delivery complaint" with an `order_id` argument. `prompts/list` describes
them and their arguments; `prompts/get` fills one in and returns messages ready to send to a model:

```python
def get_prompt(params):
    if params["name"] != "late-delivery-reply":
        raise KeyError(params["name"])
    order_id = params.get("arguments", {})["order_id"]
    text = (f"Draft a short, warm reply to a customer whose order {order_id} is late. "
            "Check the order's status with get_order first, and follow policy://shipping.")
    return {"description": "Reply to a late-delivery complaint",
            "messages": [{"role": "user", "content": {"type": "text", "text": text}}]}

get_prompt({"name": "late-delivery-reply", "arguments": {"order_id": "1043"}})["messages"][0]["content"]["text"]
```

A server with prompts declares `{"prompts": {}}`. They're the least used of the three primitives,
and the business server in this module's capstone doesn't need any.

## Transports: how the bytes move

The dispatch function doesn't care how messages arrive. The spec defines two standard transports:

- **stdio.** The host starts your server as a subprocess (`uv run server.py`) and writes JSON-RPC
  messages to its stdin, one per line. The server writes its replies to stdout, one per line.
  Messages must not contain newlines, which `json.dumps` without `indent` guarantees. It's the
  simplest transport, there's no network or port, and the server runs as the user who launched the
  host, which is the right default for local tools. A client that talks to servers of both eras
  sends `server/discover` first: a modern server answers it, and an error from an older one tells
  the client to fall back to `initialize`.
- **Streamable HTTP.** The server is a web service with one endpoint, such as `POST /mcp`. Each
  message the client sends is an HTTP POST; the reply comes back either as a JSON body or as a
  stream of server-sent events, when the server wants to send progress before the final result.
  It's the transport for remote, shared servers, and it needs everything an HTTP API needs:
  authentication (the spec builds on OAuth 2.1), TLS, and checking the `Origin` header.

Here is a whole stdio server loop, with `io.StringIO` standing in for the pipes:

```python
import io
import json

def handle(message):
    if "id" not in message:
        return None
    return {"jsonrpc": "2.0", "id": message["id"], "result": {"resultType": "complete", "tools": []}}

stdin = io.StringIO('{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}\n'
                    '{"jsonrpc": "2.0", "method": "notifications/cancelled", "params": {"requestId": 1}}\n')
stdout = io.StringIO()
for line in stdin:
    reply = handle(json.loads(line))
    if reply is not None:
        stdout.write(json.dumps(reply) + "\n")
        stdout.flush()
stdout.getvalue()
```

## Stdout belongs to the protocol

That loop has one rule you can't break: on a stdio server, **stdout carries protocol messages and
nothing else**. A stray `print("looking up order 1042")` puts a line on stdout that isn't JSON-RPC.
The client tries to parse it, fails, and depending on the client either logs an error or drops the
connection. It's the most common reason a server works when you test the function and fails the
moment Claude Desktop starts it.

Logs go to **stderr**, which hosts capture and show in their logs. Python's `logging` writes to
stderr by default, so a logger is all you need:

```python
import logging

logging.basicConfig(level=logging.INFO, format="%(name)s %(levelname)s %(message)s")   # stderr by default
logger = logging.getLogger("kiln_wiki")
logger.info("reading %s", "policy://returns")      # safe: not on stdout
```

> [!WARNING]
> A library that prints is just as bad as your own `print()`. If a dependency writes to stdout,
> wrap the call in `contextlib.redirect_stdout(sys.stderr)`.

## Where this leaves you

Resources are read-only documents with URIs and mime types, listed with `resources/list`, read
with `resources/read` (text or base64 `blob`), and grouped by URI templates; a missing one is
`-32602` with the URI in `data`. Prompts are message templates users pick. The transports only move
messages: stdio as one JSON object per line, with stdout reserved for the protocol and logs on
stderr, or Streamable HTTP for remote servers. The drills match templates, build a wiki's
resources, fix a server that prints, and write the stdio loop itself.
