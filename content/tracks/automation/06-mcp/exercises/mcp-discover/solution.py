META = "io.modelcontextprotocol/"
SUPPORTED_VERSIONS = ["2026-07-28"]
SERVER_INFO = {"name": "leith-physio-appointments", "version": "2.1.0"}
CAPABILITIES = {"tools": {}}
INSTRUCTIONS = "Find and describe appointment slots. Booking is done by reception, not by this server."
TOOLS = [{"name": "find_slots", "description": "Free appointment slots for one practitioner on one day.",
          "inputSchema": {"type": "object", "properties": {"practitioner": {"type": "string"}, "day": {"type": "string"}},
                          "required": ["practitioner", "day"]}}]


def result(message, value):
    body = {"resultType": "complete", **value, "_meta": {META + "serverInfo": SERVER_INFO}}
    return {"jsonrpc": "2.0", "id": message["id"], "result": body}


def error(message, code, text, data=None):
    body = {"code": code, "message": text}
    if data is not None:
        body["data"] = data
    return {"jsonrpc": "2.0", "id": message["id"], "error": body}


def version_error(message):
    """The error for a request whose _meta is missing or unsupported, or None if it's fine."""
    meta = (message.get("params") or {}).get("_meta") or {}
    version = meta.get(META + "protocolVersion")
    if not isinstance(version, str) or not isinstance(meta.get(META + "clientCapabilities"), dict):
        return error(message, -32602, "Invalid params: _meta needs protocolVersion and clientCapabilities")
    if version not in SUPPORTED_VERSIONS:
        return error(message, -32022, "Unsupported protocol version",
                     {"supported": SUPPORTED_VERSIONS, "requested": version})
    return None


def handle(message: dict) -> dict | None:
    """Check every request's _meta, then answer server/discover and tools/list."""
    if "id" not in message:
        return None
    problem = version_error(message)
    if problem is not None:
        return problem
    method = message.get("method")
    if method == "server/discover":
        return result(message, {"supportedVersions": SUPPORTED_VERSIONS, "capabilities": CAPABILITIES,
                                "instructions": INSTRUCTIONS})
    if method == "tools/list":
        return result(message, {"tools": TOOLS})
    return error(message, -32601, f"Method not found: {method}")
