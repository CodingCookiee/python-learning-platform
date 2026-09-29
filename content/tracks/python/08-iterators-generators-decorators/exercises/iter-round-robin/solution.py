from collections import deque


class RoundRobin:
    """One job from each queue in turn, skipping queues that have run out."""

    def __init__(self, *queues):
        self._queues = deque([iter(queue) for queue in queues])

    def __iter__(self):
        return self

    def __next__(self):
        while self._queues:
            queue = self._queues.popleft()
            try:
                job = next(queue)
            except StopIteration:
                continue
            self._queues.append(queue)
            return job
        raise StopIteration
