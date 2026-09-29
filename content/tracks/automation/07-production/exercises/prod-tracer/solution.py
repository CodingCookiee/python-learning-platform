import time
from contextlib import contextmanager
from dataclasses import dataclass, field


@dataclass
class Span:
    name: str
    span_id: str
    parent_id: str | None
    start: float
    end: float | None = None
    attributes: dict = field(default_factory=dict)
    status: str = "ok"
    error: str | None = None

    def set(self, **attributes):
        self.attributes.update(attributes)

    @property
    def duration_ms(self):
        return round((self.end - self.start) * 1000, 3)


class Tracer:
    def __init__(self, clock=time.perf_counter):
        self.clock = clock
        self.spans: list[Span] = []  # every span, in the order they started
        self._open: list[Span] = []  # the spans currently open, innermost last

    @contextmanager
    def span(self, name, **attributes):
        """Record a span around the block, nested inside whichever span is open."""
        parent_id = self._open[-1].span_id if self._open else None
        current = Span(name, f"s{len(self.spans) + 1}", parent_id, self.clock(), attributes=dict(attributes))
        self.spans.append(current)
        self._open.append(current)
        try:
            yield current
        except Exception as exc:
            current.status = "error"
            current.error = f"{type(exc).__name__}: {exc}"
            raise
        finally:
            current.end = self.clock()
            self._open.pop()
