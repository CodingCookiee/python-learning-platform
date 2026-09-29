import json
from collections import deque


class LoopDetector:
    """Spots the same tool call being made again and again."""

    def __init__(self, *, max_repeats=3, window=10):
        ...

    def record(self, name, arguments):
        ...
