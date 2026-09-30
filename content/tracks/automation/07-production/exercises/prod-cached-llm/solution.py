import hashlib
import json
import time


def cache_key(model, system, messages, *, tools=None, temperature=None, max_tokens=1024):
    request = {"model": model, "system": system, "messages": messages, "tools": tools,
               "temperature": temperature, "max_tokens": max_tokens}
    canonical = json.dumps(request, sort_keys=True, separators=(",", ":"), default=str)
    return hashlib.sha256(canonical.encode()).hexdigest()


class CachedLLM:
    """Any LLM, answering repeated deterministic requests from a cache."""

    def __init__(self, llm, *, ttl=3600.0, clock=time.time):
        self._llm = llm
        self.ttl = ttl
        self.clock = clock
        self.store = {}  # key -> (stored_at, response)
        self.hits = 0
        self.misses = 0
        self.bypassed = 0

    @property
    def model(self):
        return self._llm.model

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        options = {"system": system, "tools": tools, "model": model, "max_tokens": max_tokens, "temperature": temperature}
        if temperature != 0:
            self.bypassed += 1
            return self._llm.complete(messages, **options)

        key = cache_key(model or self._llm.model, system, messages, tools=tools, temperature=temperature, max_tokens=max_tokens)
        entry = self.store.get(key)
        if entry is not None and self.clock() - entry[0] < self.ttl:
            self.hits += 1
            return entry[1]

        self.misses += 1
        response = self._llm.complete(messages, **options)
        if response.stop_reason == "end_turn" and not response.tool_calls:
            self.store[key] = (self.clock(), response)
        return response
