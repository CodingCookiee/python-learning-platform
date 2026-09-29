import json
from collections import deque


class LoopDetector:
    """Spots the same tool call being made again and again."""

    def __init__(self, *, max_repeats: int = 3, window: int = 10):
        self.max_repeats = max_repeats
        self._recent: deque[tuple[str, str]] = deque(maxlen=window)

    def record(self, name: str, arguments: dict) -> str | None:
        key = (name, json.dumps(arguments, sort_keys=True))
        self._recent.append(key)
        count = self._recent.count(key)
        if count >= self.max_repeats:
            return f"{name} was called {count} times with the same arguments"
        return None
