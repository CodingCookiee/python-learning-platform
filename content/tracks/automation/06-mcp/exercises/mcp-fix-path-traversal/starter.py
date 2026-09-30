from pathlib import Path
from urllib.parse import unquote

PREFIX = "handbook://"


class ResourceNotFound(Exception):
    pass


class HandbookServer:
    """Serves the markdown files under root as handbook://<relative path> resources."""

    def __init__(self, root):
        self.root = Path(root)

    def list_resources(self):
        return {"resources": [
            {"uri": PREFIX + path.relative_to(self.root).as_posix(), "name": path.stem, "mimeType": "text/markdown"}
            for path in sorted(self.root.rglob("*.md"))
        ]}

    def read_resource(self, uri):
        if not uri.startswith(PREFIX):
            raise ResourceNotFound(uri)
        path = self.root / unquote(uri.removeprefix(PREFIX))
        if not path.exists():
            raise ResourceNotFound(uri)
        return {"contents": [{"uri": uri, "mimeType": "text/markdown", "text": path.read_text(encoding="utf-8")}]}

    def handle(self, message):
        if "id" not in message:
            return None
        reply = {"jsonrpc": "2.0", "id": message["id"]}
        method, params = message["method"], message.get("params") or {}
        try:
            if method == "server/discover":
                reply["result"] = {"supportedVersions": ["2026-07-28"], "capabilities": {"resources": {}},
                                   "_meta": {"io.modelcontextprotocol/serverInfo": {"name": "kiln-handbook", "version": "1.0.2"}}}
            elif method == "resources/list":
                reply["result"] = self.list_resources()
            elif method == "resources/read":
                reply["result"] = self.read_resource(str(params.get("uri")))
            else:
                reply["error"] = {"code": -32601, "message": f"Method not found: {method}"}
        except ResourceNotFound as missing:
            reply["error"] = {"code": -32602, "message": f"Resource not found: {missing}", "data": {"uri": str(missing)}}
        if "result" in reply:
            reply["result"] = {"resultType": "complete", **reply["result"]}
        return reply
