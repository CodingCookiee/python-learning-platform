Finish the `Tracer` the rest of the module uses. `tracer.span(name, **attributes)` is a context
manager that yields a `Span` (in the starter) and records it in `tracer.spans`:

- Spans are added to `tracer.spans` when they **start**, with ids `"s1"`, `"s2"`, ... in that order.
- A span's `parent_id` is the id of the span that was open around it, or `None` at the top level.
  Spans can nest to any depth, and siblings share a parent.
- `start` and `end` come from `tracer.clock()`: read once on entering and once on leaving.
- The keyword arguments become the span's `attributes`; code inside the block can add more with
  `span.set(key=value)`.
- If the block raises, the span's `status` becomes `"error"` and its `error` is
  `"<ExceptionType>: <message>"`, and the exception carries on to the caller unchanged. The span
  still gets its `end`, and the next span doesn't think it's inside the failed one.

```python
tracer = Tracer(clock=iter([0.0, 0.1, 1.5, 1.6, 2.0, 2.1]).__next__)
with tracer.span("extract_invoice", document_id="doc_88213"):
    with tracer.span("llm.complete") as call:
        call.set(model="model-small")
    with tracer.span("tool.lookup_vendor"):
        pass
[(s.name, s.span_id, s.parent_id, s.duration_ms) for s in tracer.spans]
# [('extract_invoice', 's1', None, 2100.0),
#  ('llm.complete', 's2', 's1', 1400.0),
#  ('tool.lookup_vendor', 's3', 's1', 400.0)]
```
