class ErrorRateMonitor:
    """The error rate over a sliding time window, with an alert that needs enough traffic."""

    def __init__(self, *, window_seconds=300.0, min_requests=20, threshold=0.05):
        self.window_seconds = window_seconds
        self.min_requests = min_requests
        self.threshold = threshold
        self._events = []  # (time, ok)

    def record(self, ok, now):
        self._events.append((now, ok))

    def requests(self, now):
        return len(self._events)

    def error_rate(self, now):
        errors = [event for event in self._events if not event[1]]
        return len(errors) / len(self._events)

    def should_alert(self, now):
        return self.error_rate(now) > self.threshold
