import json
import logging
import sys

logger = logging.getLogger("kiln_wiki")

DOCS = {
    "policy://returns": "# Returns\n\nUnused items can be returned within 30 days of delivery.",
    "policy://shipping": "# Shipping\n\nOrders ship within two working days.",
}


def read_resource(uri):
    print(f"reading {uri}")
    return {"contents": [{"uri": uri, "mimeType": "text/markdown", "text": DOCS[uri]}]}


def handle(message):
    if "id" not in message:
        return None
    reply = {"jsonrpc": "2.0", "id": message["id"]}
    method, params = message["method"], message.get("params") or {}
    if method == "initialize":
        reply["result"] = {"protocolVersion": "2025-06-18", "capabilities": {"resources": {}},
                           "serverInfo": {"name": "kiln-wiki", "version": "0.4.1"}}
    elif method == "resources/read" and params.get("uri") in DOCS:
        reply["result"] = read_resource(params["uri"])
    elif method == "resources/read":
        reply["error"] = {"code": -32602, "message": f"Resource not found: {params.get('uri')}"}
    else:
        reply["error"] = {"code": -32601, "message": f"Method not found: {method}"}
    return reply


def serve(handle, stdin=None, stdout=None):
    """Read one JSON-RPC message per line from stdin, and write each reply as one line."""
    stdin = stdin or sys.stdin
    stdout = stdout or sys.stdout
    print("kiln-wiki MCP server ready")
    for line in stdin:
        if not line.strip():
            continue
        reply = handle(json.loads(line))
        if reply is not None:
            stdout.write(json.dumps(reply) + "\n")
            stdout.flush()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    serve(handle)
