import hashlib
import json


def idempotency_key(tool_name: str, arguments: dict) -> str:
    """The same key for the same tool call, whatever order the arguments are in."""
    canonical = json.dumps(arguments, sort_keys=True, separators=(",", ":"), default=str)
    return f"{tool_name}:{hashlib.sha256(canonical.encode()).hexdigest()[:16]}"
