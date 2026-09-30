META = "io.modelcontextprotocol/"
SERVER_INFO = {"name": "kiln-orders", "version": "1.0.0"}


def result(message, value):
    """The success response to a request."""
    return {"jsonrpc": "2.0", "result": {"resultType": "complete", **value}}


def error(message, code, text):
    """The error response to a request."""
    return {"jsonrpc": "2.0", "id": message["id"], "error": {"code": code, "message": text}}


def handle(message):
    if "id" not in message:
        return None
    method = message["method"]
    if method == "server/discover":
        return result(message, {
            "supportedVersions": ["2026-07-28"],
            "capabilities": {"tools": {}},
            "_meta": {META + "serverInfo": SERVER_INFO},
        })
    if method == "tools/list":
        return result(message, {"tools": []})
    return error(message, -32601, f"Method not found: {method}")
