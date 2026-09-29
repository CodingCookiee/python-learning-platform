SUPPORTED_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"]     # newest first
SERVER_INFO = {"name": "leith-physio-appointments", "version": "2.1.0"}
CAPABILITIES = {"tools": {"listChanged": False}}
INSTRUCTIONS = "Find and describe appointment slots. Booking is done by reception, not by this server."


def reply(message, result):
    return {"jsonrpc": "2.0", "id": message["id"], "result": result}


def error(message, code, text):
    return {"jsonrpc": "2.0", "id": message["id"], "error": {"code": code, "message": text}}


def initialize(message):
    params = message.get("params") or {}
    requested = params.get("protocolVersion")
    if not isinstance(requested, str):
        return error(message, -32602, "Invalid params: protocolVersion is required")
    version = requested if requested in SUPPORTED_VERSIONS else SUPPORTED_VERSIONS[0]
    return reply(message, {
        "protocolVersion": version,
        "capabilities": CAPABILITIES,
        "serverInfo": SERVER_INFO,
        "instructions": INSTRUCTIONS,
    })


def handle(message: dict) -> dict | None:
    """Answer initialize and ping; ignore notifications."""
    if "id" not in message:
        return None
    method = message.get("method")
    if method == "initialize":
        return initialize(message)
    if method == "ping":
        return reply(message, {})
    return error(message, -32601, f"Method not found: {method}")
