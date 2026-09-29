SERVER_INFO = {"name": "kiln-orders", "version": "1.0.0"}


def result(message, value):
    """The success response to a request."""
    return {"jsonrpc": "2.0", "result": value}


def error(message, code, text):
    """The error response to a request."""
    return {"jsonrpc": "2.0", "id": message["id"], "error": {"code": code, "message": text}}


def handle(message):
    if "id" not in message:
        return None
    method = message["method"]
    if method == "initialize":
        return result(message, {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "serverInfo": SERVER_INFO,
        })
    if method == "ping":
        return result(message, {})
    return error(message, -32601, f"Method not found: {method}")
