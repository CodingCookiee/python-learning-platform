def message_kind(message: dict) -> str:
    """"request", "notification", "result" or "error". Raises ValueError for non-JSON-RPC 2.0."""
    if message.get("jsonrpc") != "2.0":
        raise ValueError("Not a JSON-RPC 2.0 message")
    if "method" in message:
        return "request" if "id" in message else "notification"
    return "error" if "error" in message else "result"
