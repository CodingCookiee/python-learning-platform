import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from decimal import Decimal


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
        self.spans = []
        self._open = []

    @contextmanager
    def span(self, name, **attributes):
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


class TracedLLM:
    """Any LLM, with an "llm.complete" span around every call."""

    def __init__(self, llm, tracer, *, prices, prompt_version):
        self._llm = llm
        self._tracer = tracer
        self._prices = prices
        self.prompt_version = prompt_version

    @property
    def model(self):
        return self._llm.model

    def complete(self, messages, *, system=None, tools=None, model=None, max_tokens=1024, temperature=None):
        requested = model or self._llm.model
        with self._tracer.span("llm.complete", prompt_version=self.prompt_version, requested_model=requested) as span:
            try:
                response = self._llm.complete(
                    messages, system=system, tools=tools, model=model, max_tokens=max_tokens, temperature=temperature
                )
            except Exception as exc:
                span.set(error_type=type(exc).__name__)
                raise
            usage = response.usage
            span.set(
                model=response.model,
                input_tokens=usage.input_tokens,
                output_tokens=usage.output_tokens,
                stop_reason=response.stop_reason,
                tool_calls=[call.name for call in response.tool_calls],
                cost_usd=self._cost(response.model, usage),
            )
            return response

    def _cost(self, model, usage):
        price = self._prices.get(model)
        if price is None:
            return None
        return (usage.input_tokens * price["input"] + usage.output_tokens * price["output"]) / 1_000_000
