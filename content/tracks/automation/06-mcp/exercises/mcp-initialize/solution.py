META = "io.modelcontextprotocol/"
SUPPORTED_VERSIONS = ["2026-07-28"]                                  # modern, per-request _meta
LEGACY_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"]         # the initialize handshake, newest first
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
    """The error for a modern request whose _meta is missing or unsupported, or None if it's fine."""
    meta = (message.get("params") or {}).get("_meta") or {}
    version = meta.get(META + "protocolVersion")
    if not isinstance(version, str) or not isinstance(meta.get(META + "clientCapabilities"), dict):
        return error(message, -32602, "Invalid params: _meta needs protocolVersion and clientCapabilities")
    if version not in SUPPORTED_VERSIONS:
        return error(message, -32022, "Unsupported protocol version",
                     {"supported": SUPPORTED_VERSIONS, "requested": version})
    return None


def is_modern(message) -> bool:
    meta = (message.get("params") or {}).get("_meta") or {}
    return META + "protocolVersion" in meta


class AppointmentServer:
    """One connection's server. Modern requests are stateless; initialize switches on the older mode."""

    def __init__(self):
        self.legacy_version = None       # set by initialize, for older clients on this connection

    def handle(self, message: dict) -> dict | None:
        if "id" not in message:
            return None
        if message.get("method") == "initialize":
            return self.initialize(message)
        if self.legacy_version is None or is_modern(message):
            problem = version_error(message)
            if problem is not None:
                return problem
        return self.dispatch(message)

    def initialize(self, message):
        requested = (message.get("params") or {}).get("protocolVersion")
        if not isinstance(requested, str):
            return error(message, -32602, "Invalid params: protocolVersion is required")
        self.legacy_version = requested if requested in LEGACY_VERSIONS else LEGACY_VERSIONS[0]
        return result(message, {"protocolVersion": self.legacy_version, "capabilities": CAPABILITIES,
                                "serverInfo": SERVER_INFO, "instructions": INSTRUCTIONS})

    def dispatch(self, message):
        method = message.get("method")
        if method == "server/discover":
            return result(message, {"supportedVersions": SUPPORTED_VERSIONS, "capabilities": CAPABILITIES,
                                    "instructions": INSTRUCTIONS})
        if method == "tools/list":
            return result(message, {"tools": TOOLS})
        return error(message, -32601, f"Method not found: {method}")
