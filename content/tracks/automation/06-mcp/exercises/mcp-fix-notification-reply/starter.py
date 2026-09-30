META = "io.modelcontextprotocol/"


class WikiServer:
    """The staff wiki's MCP server (the protocol part only)."""

    def __init__(self):
        self.cancelled = []            # request ids the client has given up on

    def discover(self, params):
        return {
            "supportedVersions": ["2026-07-28"],
            "capabilities": {"resources": {}},
            "_meta": {META + "serverInfo": {"name": "kiln-wiki", "version": "0.3.0"}},
        }

    def list_resources(self, params):
        return {"resources": [{"uri": "wiki://holidays", "name": "holidays", "mimeType": "text/markdown"}]}

    def cancel(self, params):
        self.cancelled.append(params["requestId"])
        return {}

    REQUESTS = {"server/discover": discover, "resources/list": list_resources}
    NOTIFICATIONS = {"notifications/cancelled": cancel}

    def handle(self, message):
        method = message["method"]
        handler = self.REQUESTS.get(method) or self.NOTIFICATIONS.get(method)
        if handler is None:
            return {"jsonrpc": "2.0", "id": message.get("id"),
                    "error": {"code": -32601, "message": f"Method not found: {method}"}}
        result = handler(self, message.get("params", {}))
        return {"jsonrpc": "2.0", "id": message.get("id"), "result": {"resultType": "complete", **result}}
