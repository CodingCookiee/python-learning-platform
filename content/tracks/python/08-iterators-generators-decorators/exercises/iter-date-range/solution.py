from datetime import date, timedelta


class DateRange:
    """Dates from start up to (not including) stop, step_days apart."""

    def __init__(self, start, stop, step_days=1):
        if step_days < 1:
            raise ValueError("step_days must be at least 1")
        self._next = start
        self._stop = stop
        self._step = timedelta(days=step_days)

    def __iter__(self):
        return self

    def __next__(self):
        if self._next >= self._stop:
            raise StopIteration
        current = self._next
        self._next += self._step
        return current
