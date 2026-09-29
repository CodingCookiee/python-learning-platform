import math
from dataclasses import dataclass, field


@dataclass
class Memory:
    text: str
    meta: dict = field(default_factory=dict)
    score: float = 0.0


class MemoryStore:
    """Facts that outlive a conversation, found again by meaning."""

    def __init__(self, embed):
        ...

    def remember(self, text, **meta):
        ...

    def recall(self, query, *, k=3, min_score=0.2, where=None):
        ...

    def __len__(self):
        ...
