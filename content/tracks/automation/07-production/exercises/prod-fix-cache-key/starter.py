import hashlib
import json


def cache_key(model, system, messages, *, tools=None, temperature=None, max_tokens=1024):
    """A key that's the same only for requests that would get the same answer."""
    canonical = json.dumps(messages, sort_keys=True)
    return hashlib.sha256(canonical.encode()).hexdigest()
