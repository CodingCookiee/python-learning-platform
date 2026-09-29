import itertools
from decimal import Decimal

from plp import hidden, raises, test
from plp_fakes import Fail, FakeLLMError, Reply, ScriptedLLM, Timeout, Usage, tool_call
from solution import TracedLLM, Tracer

PRICES = {  # EXAMPLE prices, dollars per million tokens
    "model-small": {"input": Decimal("0.50"), "output": Decimal("2.00")},
    "model-large": {"input": Decimal("12.00"), "output": Decimal("48.00")},
}
DOCUMENT = [{"role": "user", "content": "Kiln Supplies INV-2291 total 1,240.50 EUR, contact ada@kiln.example"}]
SYSTEM = "Extract the invoice as JSON. SYSTEM-PROMPT-MARKER"


def traced(replies, model="model-small"):
    tracer = Tracer(clock=itertools.count(0, 0.25).__next__)
    fake = ScriptedLLM(replies, model=model)
    return TracedLLM(fake, tracer, prices=PRICES, prompt_version="invoice-v7"), fake, tracer


@test("Records the example's span")
def _():
    llm, _fake, tracer = traced([Reply("INV-2291", usage=Usage(1850, 96))])
    llm.complete([{"role": "user", "content": "Kiln Supplies INV-2291 ..."}], temperature=0)
    assert tracer.spans[0].attributes == {
        "prompt_version": "invoice-v7",
        "requested_model": "model-small",
        "model": "model-small",
        "input_tokens": 1850,
        "output_tokens": 96,
        "stop_reason": "end_turn",
        "tool_calls": [],
        "cost_usd": Decimal("0.001117"),
    }
    assert tracer.spans[0].name == "llm.complete"


@test("Passes every argument through and returns the response")
def _():
    llm, fake, _tracer = traced(["INV-2291"])
    tools = [{"name": "lookup_vendor", "description": "Find a vendor", "parameters": {"type": "object"}}]
    response = llm.complete(DOCUMENT, system=SYSTEM, tools=tools, model="model-large", max_tokens=300, temperature=0)
    assert response.text == "INV-2291"
    call = fake.calls[0]
    assert (call["system"], call["tools"], call["model"], call["max_tokens"], call["temperature"]) == (SYSTEM, tools, "model-large", 300, 0)


@test("Records the tool names and the model the response names")
def _():
    llm, _fake, tracer = traced([Reply(tool_calls=[tool_call("lookup_vendor", name="Kiln Supplies")], usage=Usage(900, 20))])
    llm.complete(DOCUMENT, model="model-large")
    attributes = tracer.spans[0].attributes
    assert attributes["tool_calls"] == ["lookup_vendor"]
    assert attributes["stop_reason"] == "tool_use"
    assert (attributes["requested_model"], attributes["model"]) == ("model-large", "model-large")
    assert attributes["cost_usd"] == Decimal("0.01176")


@test("A failed call is an error span with its error type, and still raises")
def _():
    llm, _fake, tracer = traced([Fail(529, "Overloaded")])
    raises(FakeLLMError, llm.complete, DOCUMENT, match="529")
    span = tracer.spans[0]
    assert span.status == "error"
    assert span.attributes["error_type"] == "FakeLLMError"
    assert span.attributes["prompt_version"] == "invoice-v7"


@hidden("No message content, system prompt or tools in any span")
def _():
    llm, _fake, tracer = traced(["INV-2291", Timeout()])
    tools = [{"name": "lookup_vendor", "description": "TOOL-DESCRIPTION-MARKER", "parameters": {"type": "object"}}]
    llm.complete(DOCUMENT, system=SYSTEM, tools=tools)
    raises(TimeoutError, llm.complete, DOCUMENT, system=SYSTEM)
    recorded = repr([s.attributes for s in tracer.spans])
    for secret in ("ada@kiln.example", "Kiln Supplies", "SYSTEM-PROMPT-MARKER", "TOOL-DESCRIPTION-MARKER"):
        assert secret not in recorded, f"{secret!r} was recorded in a span"
    assert tracer.spans[1].attributes["error_type"] == "TimeoutError"


@hidden("A model with no price gets cost_usd None, and each call gets its own span")
def _():
    llm, _fake, tracer = traced(["one", "two"], model="model-new")
    llm.complete(DOCUMENT)
    llm.complete(DOCUMENT)
    assert [s.attributes["cost_usd"] for s in tracer.spans] == [None, None]
    assert [s.span_id for s in tracer.spans] == ["s1", "s2"]
    assert tracer.spans[0].duration_ms == 250.0
