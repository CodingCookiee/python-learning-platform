import math
from dataclasses import dataclass, field


@dataclass
class Memory:
    text: str
    meta: dict = field(default_factory=dict)
    score: float = 0.0


def cosine(a: list[float], b: list[float]) -> float:
    dot = sum(x * y for x, y in zip(a, b))
    norms = math.sqrt(sum(x * x for x in a)) * math.sqrt(sum(y * y for y in b))
    return dot / norms if norms else 0.0


class MemoryStore:
    """Facts that outlive a conversation, found again by meaning."""

    def __init__(self, embed):
        self._embed = embed
        self._items: list[tuple[str, dict, list[float]]] = []

    def remember(self, text: str, **meta) -> None:
        self._items.append((text, meta, self._embed([text])[0]))

    def recall(self, query: str, *, k: int = 3, min_score: float = 0.2, where: dict | None = None) -> list[Memory]:
        wanted = where or {}
        vector = self._embed([query])[0]
        scored = []
        for text, meta, stored in self._items:
            if any(meta.get(key) != value for key, value in wanted.items()):
                continue
            score = cosine(vector, stored)
            if score >= min_score:
                scored.append(Memory(text, meta, score))
        return sorted(scored, key=lambda memory: memory.score, reverse=True)[:k]

    def __len__(self) -> int:
        return len(self._items)
