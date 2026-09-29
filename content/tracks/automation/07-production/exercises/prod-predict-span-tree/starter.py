from contextlib import contextmanager
from dataclasses import dataclass

clock = iter(range(0, 10_000, 100)).__next__  # a fake clock in ms: 0, 100, 200, ... one step per call


@dataclass
class Span:
    name: str
    parent: str | None
    start: int
    end: int = 0
    status: str = "ok"


spans, open_spans = [], []


@contextmanager
def span(name):
    current = Span(name, open_spans[-1].name if open_spans else None, clock())
    spans.append(current)
    open_spans.append(current)
    try:
        yield current
    except Exception as exc:
        current.status = type(exc).__name__
        raise
    finally:
        current.end = clock()
        open_spans.pop()


def lookup_vendor(name):
    with span("tool.lookup_vendor"):
        raise TimeoutError(f"vendor API didn't answer for {name}")


def extract_invoice(document_id):
    with span("extract_invoice"):
        with span("llm.complete"):
            pass
        try:
            lookup_vendor("Kiln Supplies")
        except TimeoutError:
            pass
        with span("llm.complete"):
            pass


extract_invoice("doc_88213")
for s in spans:
    print(f"{s.name:<20} parent={s.parent}  {s.end - s.start} ms  {s.status}")
