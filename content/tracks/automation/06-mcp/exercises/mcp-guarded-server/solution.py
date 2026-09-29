import math
import time
from collections import deque

WINDOW_SECONDS = 60


def guard(handle, *, allowed_tools: set[str], calls_per_minute: int, clock=time.monotonic):
    """handle, limited to allowed_tools and at most calls_per_minute tool calls per minute."""
    recent: deque[float] = deque()          # when the calls we let through happened

    def rate_limited() -> str | None:
        now = clock()
        while recent and recent[0] <= now - WINDOW_SECONDS:
            recent.popleft()
        if len(recent) >= calls_per_minute:
            wait = math.ceil(recent[0] + WINDOW_SECONDS - now)
            return f"Rate limit reached: try again in {wait} s"
        recent.append(now)
        return None

    def guarded(message):
        if "id" not in message:
            return handle(message)
        method, params = message.get("method"), message.get("params") or {}

        if method == "tools/list":
            reply = handle(message)
            if "result" in reply:
                tools = [tool for tool in reply["result"].get("tools", []) if tool["name"] in allowed_tools]
                reply = {**reply, "result": {**reply["result"], "tools": tools}}
            return reply

        if method == "tools/call":
            name = params.get("name")
            if name not in allowed_tools:
                return {"jsonrpc": "2.0", "id": message["id"],
                        "error": {"code": -32602, "message": f"Unknown tool: {name}"}}
            refusal = rate_limited()
            if refusal is not None:
                return {"jsonrpc": "2.0", "id": message["id"],
                        "result": {"content": [{"type": "text", "text": refusal}], "isError": True}}

        return handle(message)

    return guarded
