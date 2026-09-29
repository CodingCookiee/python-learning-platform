import json

from pydantic import BaseModel, Field, ValidationError

from plp import hidden, raises, test
from plp_fakes import Reply, ScriptedLLM
from solution import ExtractionFailed, extract_native


class Invoice(BaseModel):
    invoice_number: str
    vendor: str
    total: float = Field(gt=0)


class NoSchemaLLM:
    """A client whose model has no structured outputs: schema= raises NotImplementedError."""

    def __init__(self, replies):
        self.inner = ScriptedLLM(replies)
        self.calls = self.inner.calls
        self.refused = 0

    def complete(self, messages, **options):
        if options.get("schema") is not None:
            self.refused += 1
            raise NotImplementedError("This model doesn't support structured outputs")
        return self.inner.complete(messages, **options)


DOCUMENT = "Invoice INV-2291 ..."
GOOD = '{"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "total": 1240.5}'


@test("Extracts the example with a strict schema")
def _():
    llm = ScriptedLLM([GOOD])
    invoice = extract_native(llm, DOCUMENT, Invoice, system="Extract the invoice.")
    assert invoice.total == 1240.5
    assert llm.calls[0]["schema"]["required"] == ["invoice_number", "vendor", "total"]
    assert llm.calls[0]["schema"]["additionalProperties"] is False


@test("Sends the document in tags, the system prompt and temperature 0")
def _():
    llm = ScriptedLLM([GOOD])
    extract_native(llm, DOCUMENT, Invoice, system="Extract the invoice.")
    assert llm.calls[0]["messages"] == [{"role": "user", "content": f"<document>\n{DOCUMENT}\n</document>"}]
    assert llm.calls[0]["system"] == "Extract the invoice."
    assert llm.calls[0]["temperature"] == 0
    assert len(llm.calls) == 1


@test("Still validates a reply that matches the schema")
def _():
    llm = ScriptedLLM(['{"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "total": -40}'])
    raises(ValidationError, extract_native, llm, DOCUMENT, Invoice, system="Extract the invoice.")


@test("Refuses replies cut off at max_tokens, and refusals")
def _():
    llm = ScriptedLLM([Reply(text='{"invoice_number": "INV-22', stop_reason="max_tokens")])
    raises(ExtractionFailed, extract_native, llm, DOCUMENT, Invoice, system="Extract.", match="max_tokens")
    llm = ScriptedLLM([Reply(text="I can't help with that.", stop_reason="refusal")])
    raises(ExtractionFailed, extract_native, llm, DOCUMENT, Invoice, system="Extract.", match="refused")


@test("Falls back to the schema in the prompt when schema= isn't supported")
def _():
    llm = NoSchemaLLM([GOOD])
    assert extract_native(llm, DOCUMENT, Invoice, system="Extract the invoice.").vendor == "Kiln Supplies"
    assert llm.refused == 1
    call = llm.calls[0]
    assert call.get("schema") is None
    schema = json.loads(call["system"].split("JSON schema:\n", 1)[1])
    assert schema["required"] == ["invoice_number", "vendor", "total"]
    assert call["system"].startswith("Extract the invoice.\n\nReply with only a JSON object")


@hidden("The fallback copes with prose and fences around the JSON")
def _():
    fence = "`" * 3
    llm = NoSchemaLLM(["Here you go:\n" + fence + "json\n" + GOOD + "\n" + fence])
    assert extract_native(llm, DOCUMENT, Invoice, system="Extract.").invoice_number == "INV-2291"
    assert llm.calls[0]["temperature"] == 0


@hidden("The fallback checks the stop reason too")
def _():
    llm = NoSchemaLLM([Reply(text='{"invoice_number"', stop_reason="max_tokens")])
    raises(ExtractionFailed, extract_native, llm, DOCUMENT, Invoice, system="Extract.", match="max_tokens")
