from collections import deque


class RoundRobin:
    """One job from each queue in turn, skipping queues that have run out."""

    def __init__(self, *queues):
        ...
