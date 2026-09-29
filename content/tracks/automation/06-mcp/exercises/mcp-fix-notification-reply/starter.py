class WikiServer:
    """The staff wiki's MCP server (the protocol part only)."""

    def __init__(self):
        self.ready = False

    def initialize(self, params):
        return {
            "protocolVersion": "2025-06-18",
            "capabilities": {"resources": {}},
            "serverInfo": {"name": "kiln-wiki", "version": "0.3.0"},
        }

    def ping(self, params):
        return {}

    def initialized(self, params):
        self.ready = True
        return {}

    REQUESTS = {"initialize": initialize, "ping": ping}
    NOTIFICATIONS = {"notifications/initialized": initialized}

    def handle(self, message):
        method = message["method"]
        handler = self.REQUESTS.get(method) or self.NOTIFICATIONS.get(method)
        if handler is None:
            return {"jsonrpc": "2.0", "id": message.get("id"),
                    "error": {"code": -32601, "message": f"Method not found: {method}"}}
        return {"jsonrpc": "2.0", "id": message.get("id"), "result": handler(self, message.get("params", {}))}
