import json
import logging
import time

SENSITIVE = {"password", "token", "api_key", "card_number", "email"}
AUDITED_METHODS = {"tools/call", "resources/read"}


def redacted(arguments: dict) -> dict:
    return {key: "[redacted]" if key in SENSITIVE else value for key, value in arguments.items()}


def outcome_of(reply) -> str:
    if "error" in reply:
        return "protocol_error"
    return "tool_error" if reply.get("result", {}).get("isError") else "ok"


def audited(handle, logger: logging.Logger, *, clock=time.monotonic):
    """handle, with one JSON audit record per tools/call and resources/read request."""
    state = {"client": "unknown"}

    def audited_handle(message):
        method = message.get("method")
        params = message.get("params") or {}
        if method == "initialize" and "id" in message:
            state["client"] = params.get("clientInfo", {}).get("name", "unknown")
        if "id" not in message or method not in AUDITED_METHODS:
            return handle(message)

        if method == "tools/call":
            target, arguments = params.get("name"), redacted(params.get("arguments") or {})
        else:
            target, arguments = params.get("uri"), {}
        entry = {"client": state["client"], "method": method, "target": target, "arguments": arguments}

        start = clock()
        try:
            reply = handle(message)
        except Exception:
            logger.info(json.dumps({**entry, "outcome": "exception", "ms": round((clock() - start) * 1000)}))
            raise
        logger.info(json.dumps({**entry, "outcome": outcome_of(reply), "ms": round((clock() - start) * 1000)}))
        return reply

    return audited_handle
