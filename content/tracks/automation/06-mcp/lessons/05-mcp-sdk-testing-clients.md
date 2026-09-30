---
slug: mcp-sdk-testing-clients
title: The SDK, testing, and connecting clients
summary: Build the same server with the official Python SDK and inspect it, test it at two levels, then connect it to Claude Desktop, Claude Code, an IDE and your own agent.
minutes: 55
exercises:
  - mcp-tools-to-neutral
  - mcp-fix-content-blocks
  - mcp-test-order-server
  - mcp-agent-bridge
lab:
  title: The order server, tested
  kind: output
  instructions: >-
    Save test_server.py from "Testing at two levels" next to server.py, add pytest and anyio as
    dev dependencies, run the command below and paste its output. Every test must pass.
  command: uv run pytest -q
  patterns:
    - '^(=+ )?\d+ passed(, \d+ warnings?)? in [\d.]+s'
---

You now know every message a server sends and receives, which is exactly what you need to use the
official SDK well: it writes the envelope, the version checks, the schemas and the transport for you,
and when something goes wrong you know what it's doing underneath. This lesson builds the Kiln & Co
order server with the SDK on your machine, tests it, and plugs it into the clients people actually
use, including the agent you built in A5.

## The official Python SDK

The SDK is the `mcp` package. This lesson uses **v2** (2.2.0 is current as of September 2026),
where the high-level server class is `MCPServer`. In v1 the same class was called `FastMCP` and
lived in `mcp.server.fastmcp`; the decorators work the same way.

```python norun
# server.py  (mcp 2.x)
from typing import Annotated

from pydantic import Field
from mcp.server import MCPServer
from mcp.server.mcpserver.exceptions import ToolError

mcp = MCPServer("kiln-orders", instructions="Look up Kiln & Co orders by their four-digit number.")

ORDERS = {"1042": {"order_id": "1042", "status": "shipped", "carrier": "DPD"}}


@mcp.tool()
def get_order(order_id: Annotated[str, Field(pattern=r"^\d{4}$", description="Four-digit order number")]) -> dict:
    """Look up one order by its number. Returns its status and carrier."""
    if order_id not in ORDERS:
        raise ToolError(f"Order {order_id} not found")
    return ORDERS[order_id]


@mcp.resource("policy://returns", mime_type="text/markdown")
def returns_policy() -> str:
    """Kiln & Co's returns policy."""
    return "# Returns\n\nUnused items can be returned within 30 days of delivery."


if __name__ == "__main__":
    mcp.run()          # stdio by default; mcp.run(transport="streamable-http", port=3001) for HTTP
```

Everything from lessons 2 to 4 is in there, done for you:

- `@mcp.tool()` builds the tool's `inputSchema` from the type hints and its description from the
  docstring, as you did by hand in A3, and validates the arguments before your function runs.
  Invalid arguments come back to the model as an `isError` result.
- `ToolError` becomes an `isError` result with your message. Any other exception also becomes an
  `isError` result, but with a generic message ("Error executing tool get_order"), and the traceback
  goes to the server's log, not the client. An `MCPError` is the one exception that becomes a
  JSON-RPC protocol error.
- A `dict` or Pydantic return value is sent as `structuredContent` plus a JSON text block.
- `@mcp.resource(uri)` registers a resource; a URI with `{placeholders}` becomes a template, and
  the placeholders must match the function's parameters.
- `mcp.run()` runs the stdio loop and checks each request's protocol version. The SDK is
  dual-era: it serves the current stateless protocol, `server/discover` included, and answers the
  `initialize` handshake for older clients.

Keep `mcp.run()` under `if __name__ == "__main__":`. The CLI and the test client import your file,
and they must not start a server when they do.

The schema step isn't magic. Here is its core, runnable here: a Pydantic model built from the
function's signature.

```python
import inspect
from pydantic import create_model

def get_order(order_id: str, include_lines: bool = False) -> dict:
    """Look up one order by its number. Returns its status and carrier."""

fields = {
    name: (p.annotation, ... if p.default is inspect.Parameter.empty else p.default)
    for name, p in inspect.signature(get_order).parameters.items()
}
Arguments = create_model("GetOrderArguments", **fields)
{"name": get_order.__name__, "description": inspect.getdoc(get_order), "inputSchema": Arguments.model_json_schema()}
```

## Do it on your machine

1. Create the project and add the SDK with its CLI:

   ```bash
   uv init kiln-orders && cd kiln-orders
   uv add "mcp[cli]"
   ```

2. Save the server above as `server.py`, then open it in the **MCP Inspector**, a web UI that
   plays the client's part:

   ```bash
   uv run mcp dev server.py
   ```

3. In the Inspector, connect, open **Tools**, list them, and call `get_order` with `1042`, then
   `9999`, then `10423`. Check which ones come back with `isError`. Open **Resources** and read
   `policy://returns`. The Inspector's history pane shows the raw JSON-RPC messages: find the
   first exchange (`server/discover` from a current Inspector, `initialize` from an older one)
   and compare it with lesson 2.
4. Add a `print("hello")` at the top of `get_order`, call it again, and see what happens to the
   connection. Take it out again.
5. Check which version you have with `uv run mcp version`. If it's 1.x, change the import to
   `from mcp.server.fastmcp import FastMCP` and the class to `FastMCP`.
6. **Check it:** save `test_server.py` from the next section, run `uv run pytest -q`, and paste the
   output into the lab box below.

## Testing at two levels

Test a server the way you'd test a web service: the logic on its own, then the protocol.

**The handlers, as plain functions.** Keep the business logic out of the decorated function, so it
can be tested with no SDK, no protocol and no event loop:

```python
class OrderNotFound(Exception):
    pass

def lookup_order(orders, order_id):
    if order_id not in orders:
        raise OrderNotFound(f"Order {order_id} not found")
    return orders[order_id]

ORDERS = {"1042": {"status": "shipped"}}
try:
    lookup_order(ORDERS, "9999")
except OrderNotFound as error:
    message = str(error)
lookup_order(ORDERS, "1042"), message
```

The tool is then three lines: call `lookup_order`, and turn `OrderNotFound` into `ToolError`.

**The protocol, through a client.** This is what the drills do with `McpHarness`, and what the SDK
does locally with its in-memory `Client`, which connects to your server object directly with no
subprocess:

```python norun
# test_server.py  (uv add --dev pytest anyio)
import pytest
from mcp import Client

from server import mcp


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.mark.anyio
async def test_a_missing_order_is_a_tool_error():
    async with Client(mcp) as client:
        result = await client.call_tool("get_order", {"order_id": "9999"})
    assert result.is_error
    assert result.content[0].text == "Order 9999 not found"
```

Protocol tests catch the bugs unit tests can't: a failure reported as the wrong kind of error, a
schema that doesn't match what the function accepts, a tool that's missing from `tools/list`.

## Connecting to Claude Desktop, Claude Code and IDEs

Every client needs the same three facts: a name for the server, the command that starts it, and
its environment. **Claude Desktop** reads them from `claude_desktop_config.json` (Settings, then
Developer, then Edit Config), under `mcpServers`:

```json
{
  "mcpServers": {
    "kiln-orders": {
      "command": "uv",
      "args": ["--directory", "/Users/ada/code/kiln-orders", "run", "server.py"],
      "env": {"KILN_ORDERS_API_URL": "https://orders.internal.kiln.example"}
    }
  }
}
```

Use absolute paths: the app doesn't start in your project folder. `uv run mcp install server.py
--name "Kiln orders"` writes this entry for you. Restart Claude Desktop, and the server's tools
appear in the conversation's tool menu. If they don't, the app's MCP log shows the server's stderr.

**Claude Code** adds servers from the command line, with everything after `--` being the command:

```bash
claude mcp add --transport stdio kiln-orders -- uv run --directory /Users/ada/code/kiln-orders server.py
```

For a server the whole team should get, `--scope project` writes a `.mcp.json` into the repository,
which can refer to environment variables instead of containing secrets:

```json
{
  "mcpServers": {
    "kiln-orders": {
      "type": "stdio",
      "command": "uv",
      "args": ["run", "server.py"],
      "env": {"KILN_ORDERS_TOKEN": "${KILN_ORDERS_TOKEN}"}
    }
  }
}
```

IDEs follow the same pattern. Cursor reads `.cursor/mcp.json` with the same `mcpServers` shape, and
VS Code reads `.vscode/mcp.json`, where the top-level key is `servers`. A remote server over
Streamable HTTP is configured with a URL instead of a command, such as
`{"type": "http", "url": "https://mcp.kiln.example/mcp"}`.

```quiz
question: A server works in the Inspector but its tools never appear in Claude Desktop. What do you check first?
options:
  - The tool descriptions, because Claude ignores vague ones
  - The config's command and paths, and the MCP log for the server's stderr
  - Whether the server declares the prompts capability
answer: 1
explain: If the tools don't appear at all, the server usually never started, or crashed on its first request. A relative path, a missing uv on the app's PATH, or a print() on stdout all show up in the log.
```

## Your own agent as an MCP client

Your A5 agent can use any MCP server too. Two translations make it work, both small:

- **Definitions.** Each MCP tool becomes a neutral tool: `inputSchema` is the `parameters`. When
  the agent has several servers, prefix the names (`orders__get_order`, `wiki__search`) so they
  can't collide and each call can be routed back to its server.
- **Results.** The model's tool message is text, so the content blocks become one string, and an
  `isError` result becomes the `{"error": ...}` content your loop already sends for failed tools.

```python
import json
from plp_fakes import McpHarness

def handle(message):
    if "id" not in message:
        return None
    reply = {"jsonrpc": "2.0", "id": message["id"]}
    if message["method"] == "tools/list":
        reply["result"] = {"resultType": "complete", "tools": [{
            "name": "get_order", "description": "Look up an order.",
            "inputSchema": {"type": "object", "properties": {"order_id": {"type": "string"}}}}]}
    else:
        reply["result"] = {"resultType": "complete", "isError": True,
                           "content": [{"type": "text", "text": "Order 9999 not found"}]}
    return reply

client = McpHarness(handle, protocol="2026-07-28")
tools = [{"name": f"orders__{t['name']}", "description": t["description"], "parameters": t["inputSchema"]}
         for t in client.list_tools()]
result = client.call_tool("get_order", {"order_id": "9999"})
content = json.dumps({"error": result["content"][0]["text"]}) if result["isError"] else result["content"][0]["text"]
tools[0]["name"], content
```

In production the client side is the SDK's `Client`, connected over stdio to a server process or
over HTTP to a URL; the translation code is the same. The last drill builds it for real: a toolbox
per server, and the A5 loop routing calls between them.

## Where this leaves you

The SDK's `MCPServer` turns decorated, type-hinted functions into tools and resources, with the
version checks, validation, error mapping and stdio loop done for you; `ToolError` is the model-facing
failure. You inspect a server with `mcp dev`, test its logic as plain functions and its protocol
through a client, and connect it with a name, a command and an environment, in Claude Desktop's
config, `claude mcp add` or an IDE's `mcp.json`. Your own agent is one more client: MCP tools become
neutral tools, and results become tool messages.
