import hashlib
import json


def cache_key(model, system, messages, *, tools=None, temperature=None, max_tokens=1024):
    """A key that's the same only for requests that would get the same answer."""
    request = {
        "model": model,
        "system": system,
        "messages": messages,
        "tools": tools,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    canonical = json.dumps(request, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()
