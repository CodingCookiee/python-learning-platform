import time


class CircuitOpen(Exception):
    """The breaker is open: the call was refused without reaching the provider."""


class CircuitBreaker:
    """Stops calling a provider after repeated failures, then tries again after a cool-down.

    closed: calls go through; consecutive failures are counted.
    open: calls are refused at once, until `cooldown` seconds have passed since it opened.
    half_open: one trial call goes through; success closes the breaker, failure opens it again.
    """

    def __init__(self, *, failure_threshold=5, cooldown=30.0, clock=time.monotonic):
        self.failure_threshold = failure_threshold
        self.cooldown = cooldown
        self.clock = clock
        self.state = "closed"
        self.failures = 0
        self.opened_at = None

    def call(self, fn, *args, **kwargs):
        if self.state == "open":
            if self.clock() - self.opened_at >= self.cooldown:
                self.state = "half_open"
            else:
                self.opened_at = self.clock()  # remember when we last refused a call
                raise CircuitOpen(f"Provider marked down; retry after {self.cooldown:.0f}s")
        try:
            result = fn(*args, **kwargs)
        except Exception:
            self._record_failure()
            raise
        self._record_success()
        return result

    def _record_failure(self):
        self.failures += 1
        if self.state == "half_open" or self.failures >= self.failure_threshold:
            self.state = "open"
            self.opened_at = self.clock()

    def _record_success(self):
        self.state = "closed"
