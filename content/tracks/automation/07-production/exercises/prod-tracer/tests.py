import itertools

from plp import hidden, raises, test
from solution import Span, Tracer


def ticking(step=0.5):
    """A clock that moves `step` seconds every time it's read."""
    return itertools.count(0, step).__next__


@test("Nests the example's spans, with durations from the clock")
def _():
    tracer = Tracer(clock=iter([0.0, 0.1, 1.5, 1.6, 2.0, 2.1]).__next__)
    with tracer.span("extract_invoice", document_id="doc_88213"):
        with tracer.span("llm.complete") as call:
            call.set(model="model-small")
        with tracer.span("tool.lookup_vendor"):
            pass
    assert [(s.name, s.span_id, s.parent_id, s.duration_ms) for s in tracer.spans] == [
        ("extract_invoice", "s1", None, 2100.0),
        ("llm.complete", "s2", "s1", 1400.0),
        ("tool.lookup_vendor", "s3", "s1", 400.0),
    ]


@test("Keeps the keyword attributes and anything set inside the block")
def _():
    tracer = Tracer(clock=ticking())
    with tracer.span("llm.complete", prompt_version="invoice-v7") as call:
        assert isinstance(call, Span)
        call.set(model="model-small", input_tokens=1850)
    assert tracer.spans[0].attributes == {"prompt_version": "invoice-v7", "model": "model-small", "input_tokens": 1850}
    assert tracer.spans[0].status == "ok"


@test("A failing block marks its span as an error and re-raises")
def _():
    tracer = Tracer(clock=ticking())
    with raises(TimeoutError, match="vendor API", what="the traced block"):
        with tracer.span("tool.lookup_vendor"):
            raise TimeoutError("vendor API didn't answer")
    failed = tracer.spans[0]
    assert (failed.status, failed.error) == ("error", "TimeoutError: vendor API didn't answer")
    assert failed.end is not None


@test("After a failure, the next span is back at the top level")
def _():
    tracer = Tracer(clock=ticking())
    try:
        with tracer.span("extract_invoice"):
            with tracer.span("llm.complete"):
                raise RuntimeError("upstream 529")
    except RuntimeError:
        pass
    with tracer.span("extract_invoice"):
        pass
    assert [(s.span_id, s.parent_id, s.status) for s in tracer.spans] == [
        ("s1", None, "error"),
        ("s2", "s1", "error"),
        ("s3", None, "ok"),
    ]


@hidden("Nests to any depth and records spans in the order they start")
def _():
    tracer = Tracer(clock=ticking(1))
    with tracer.span("triage_email"):
        with tracer.span("classify"):
            with tracer.span("llm.complete"):
                pass
        with tracer.span("draft_reply"):
            with tracer.span("llm.complete"):
                pass
            with tracer.span("tool.get_order"):
                pass
    assert [(s.name, s.parent_id) for s in tracer.spans] == [
        ("triage_email", None),
        ("classify", "s1"),
        ("llm.complete", "s2"),
        ("draft_reply", "s1"),
        ("llm.complete", "s4"),
        ("tool.get_order", "s4"),
    ]
    assert tracer.spans[0].duration_ms == 11000.0


@hidden("An error caught inside a span leaves that span ok")
def _():
    tracer = Tracer(clock=ticking())
    with tracer.span("extract_invoice"):
        try:
            with tracer.span("tool.lookup_vendor"):
                raise KeyError("V-118")
        except KeyError:
            pass
    assert [s.status for s in tracer.spans] == ["ok", "error"]
    assert tracer.spans[1].error == "KeyError: 'V-118'"
