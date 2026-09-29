import logging

logger = logging.getLogger("kiln_mcp")


class InvalidParams(Exception):
    """Raised by a handler when its params are wrong. Becomes a -32602 error."""


class Dispatcher:
    """Routes JSON-RPC 2.0 messages to registered handlers."""

    def __init__(self):
        self.methods = {}
        self.notifications = {}

    def method(self, name):
        """Decorator: register a request handler, fn(params) -> result."""
        ...

    def notification(self, name):
        """Decorator: register a notification handler, fn(params)."""
        ...

    def handle(self, message):
        """The response to a request, or None for a notification."""
        ...
