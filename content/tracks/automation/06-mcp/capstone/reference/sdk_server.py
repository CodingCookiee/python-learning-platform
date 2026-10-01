# sdk_server.py  (mcp 2.x; in mcp 1.x the class is FastMCP, from mcp.server.fastmcp)
"""Kiln & Co's business MCP server on the official Python SDK, sharing kiln_mcp's core."""

import json
import logging
import os
import sys
import time
from typing import Annotated

from pydantic import Field
from mcp.server import MCPServer
from mcp.server.mcpserver.exceptions import ToolError
from mcp.types import ToolAnnotations

import kiln_mcp as core

SECRETS = [os.environ.get("KILN_ORDERS_TOKEN")]
CLIENT = os.environ.get("KILN_MCP_CLIENT", "unknown")      # a label per deployment
READ_ONLY = ToolAnnotations(read_only_hint=True, open_world_hint=False)

store = core.InMemoryOrders(core.ORDERS)
limiter = core.RateLimiter(core.CALLS_PER_MINUTE)
mcp = MCPServer("kiln-business", instructions=core.INSTRUCTIONS)


def audit(method, target, arguments, outcome, start):
    arguments = {k: "[redacted]" if k in core.SENSITIVE else v for k, v in arguments.items()}
    entry = {"client": CLIENT, "method": method, "target": target, "arguments": arguments,
             "outcome": outcome, "ms": round((time.monotonic() - start) * 1000)}
    core.audit_logger.info(core.redact(json.dumps(entry), SECRETS))


@mcp.tool(title="Get an order", annotations=READ_ONLY)
def get_order(order_id: Annotated[str, Field(pattern=r"^\d{4}$", description="Four-digit order number, e.g. 1042")]) -> str:
    """Look up one Kiln & Co order by its four-digit number. Returns its status, dates, carrier and
    tracking number, the items and quantities, the total, and the customer's first name."""
    start, arguments = time.monotonic(), {"order_id": order_id}
    if refusal := limiter.check():
        audit("tools/call", "get_order", arguments, "rate_limited", start)
        raise ToolError(refusal)
    order = store.get(order_id)
    if order is None:
        audit("tools/call", "get_order", arguments, "tool_error", start)
        raise ToolError(f"Order {order_id} not found")
    audit("tools/call", "get_order", arguments, "ok", start)
    return core.redact(json.dumps(core.order_view(order)), SECRETS)


@mcp.tool(title="Search the policies", annotations=READ_ONLY)
def search_docs(
    query: Annotated[str, Field(min_length=2, max_length=200, description="What the customer is asking about")],
    limit: Annotated[int, Field(ge=1, le=5, description="How many policies to return, at most 5")] = 3,
) -> str:
    """Search Kiln & Co's policy documents (returns, shipping, warranty). Returns the best
    matching passages, each with a link to the full policy."""
    start, arguments = time.monotonic(), {"query": query, "limit": limit}
    if refusal := limiter.check():
        audit("tools/call", "search_docs", arguments, "rate_limited", start)
        raise ToolError(refusal)
    hits = core.search_docs(core.DOCS, query, limit)
    audit("tools/call", "search_docs", arguments, "ok", start)
    if not hits:
        return "No policy matches that query."
    text = "\n\n".join(f"{hit['title']}: {hit['snippet']} (policy://{hit['slug']})" for hit in hits)
    return core.redact(text, SECRETS)


def policy_reader(slug):
    def read() -> str:
        start = time.monotonic()
        audit("resources/read", f"policy://{slug}", {}, "ok", start)
        return core.DOCS[slug]["text"]
    return read


for slug, doc in core.DOCS.items():
    mcp.resource(f"policy://{slug}", name=slug, title=doc["title"], mime_type="text/markdown")(policy_reader(slug))


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, stream=sys.stderr)    # stdout carries the protocol
    mcp.run()
