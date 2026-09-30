from collections import deque


class ErrorRateMonitor:
    """The error rate over a sliding time window, with an alert that needs enough traffic."""

    def __init__(self, *, window_seconds=300.0, min_requests=20, threshold=0.05):
        self.window_seconds = window_seconds
        self.min_requests = min_requests
        self.threshold = threshold
        self._events = deque()  # (time, ok), oldest first
        self._errors = 0

    def record(self, ok: bool, now: float) -> None:
        self._events.append((now, ok))
        if not ok:
            self._errors += 1
        self._expire(now)

    def _expire(self, now: float) -> None:
        while self._events and self._events[0][0] <= now - self.window_seconds:
            _, ok = self._events.popleft()
            if not ok:
                self._errors -= 1

    def requests(self, now: float) -> int:
        self._expire(now)
        return len(self._events)

    def error_rate(self, now: float) -> float:
        self._expire(now)
        return self._errors / len(self._events) if self._events else 0.0

    def should_alert(self, now: float) -> bool:
        return self.requests(now) >= self.min_requests and self.error_rate(now) > self.threshold
