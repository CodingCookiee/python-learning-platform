import json
import logging
import time

META = "io.modelcontextprotocol/"
SENSITIVE = {"password", "token", "api_key", "card_number", "email"}
AUDITED_METHODS = {"tools/call", "resources/read"}


def audited(handle, logger: logging.Logger, *, clock=time.monotonic):
    """handle, with one JSON audit record per tools/call and resources/read request."""
    ...
