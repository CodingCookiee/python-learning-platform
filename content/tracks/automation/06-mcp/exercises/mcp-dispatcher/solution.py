import logging

logger = logging.getLogger("kiln_mcp")


class InvalidParams(Exception):
    """Raised by a handler when its params are wrong. Becomes a -32602 error."""


def _is_id(value):
    return isinstance(value, (str, int)) and not isinstance(value, bool)


def _error(request_id, code, message):
    return {"jsonrpc": "2.0", "id": request_id, "error": {"code": code, "message": message}}


class Dispatcher:
    """Routes JSON-RPC 2.0 messages to registered handlers."""

    def __init__(self):
        self.methods = {}
        self.notifications = {}

    def method(self, name):
        """Decorator: register a request handler, fn(params) -> result."""
        def register(fn):
            self.methods[name] = fn
            return fn
        return register

    def notification(self, name):
        """Decorator: register a notification handler, fn(params)."""
        def register(fn):
            self.notifications[name] = fn
            return fn
        return register

    def handle(self, message):
        """The response to a request, or None for a notification."""
        if not (
            isinstance(message, dict)
            and message.get("jsonrpc") == "2.0"
            and isinstance(message.get("method"), str)
            and message["method"]
        ):
            request_id = message.get("id") if isinstance(message, dict) else None
            return _error(request_id if _is_id(request_id) else None, -32600, "Invalid request")

        method = message["method"]
        params = message.get("params", {})

        if "id" not in message:
            handler = self.notifications.get(method)
            if handler is not None:
                try:
                    handler(params if isinstance(params, dict) else {})
                except Exception:
                    logger.exception("Notification %s failed", method)
            return None

        request_id = message["id"]
        handler = self.methods.get(method)
        if handler is None:
            return _error(request_id, -32601, f"Method not found: {method}")
        if not isinstance(params, dict):
            return _error(request_id, -32602, "Invalid params: params must be an object")
        try:
            result = handler(params)
        except InvalidParams as problem:
            return _error(request_id, -32602, f"Invalid params: {problem}")
        except Exception:
            logger.exception("Request %s failed", method)
            return _error(request_id, -32603, "Internal error")
        return {"jsonrpc": "2.0", "id": request_id, "result": result}
