import json
import logging

logger = logging.getLogger("kiln_mcp.stdio")


def error(request_id, code, message):
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


def serve(handle, stdin, stdout) -> None:
    """Run handle over newline-delimited JSON-RPC on stdin and stdout, until stdin ends."""

    def write(reply):
        stdout.write(json.dumps(reply) + "\n")
        stdout.flush()

    for line in stdin:
        if not line.strip():
            continue
        try:
            message = json.loads(line)
        except ValueError:
            write(error(None, -32700, "Parse error"))
            continue
        if isinstance(message, list):
            write(error(None, -32600, "Invalid request: batches are not supported"))
            continue
        if not isinstance(message, dict):
            write(error(None, -32600, "Invalid request"))
            continue
        try:
            reply = handle(message)
        except Exception:
            logger.exception("Handler failed on %s", message.get("method"))
            if "id" in message:
                write(error(message["id"], -32603, "Internal error"))
            continue
        if reply is not None:
            write(reply)
