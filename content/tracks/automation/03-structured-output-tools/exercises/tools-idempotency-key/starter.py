import hashlib
import json


def idempotency_key(tool_name, arguments):
    """The same key for the same tool call, whatever order the arguments are in."""
    return f"{tool_name}:{hashlib.sha256(str(arguments).encode()).hexdigest()[:16]}"
