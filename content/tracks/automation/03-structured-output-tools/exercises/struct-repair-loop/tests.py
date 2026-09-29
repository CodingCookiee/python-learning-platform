from typing import Literal

from pydantic import BaseModel, Field

from plp import hidden, raises, test
from plp_fakes import Reply, ScriptedLLM, Usage
from solution import ExtractionFailed, extract_with_repair


class Invoice(BaseModel):
    invoice_number: str = Field(min_length=1)
    vendor: str
    total: float = Field(gt=0)


class Lead(BaseModel):
    company: str
    seats: int | None
    plan: Literal["starter", "team", "enterprise"]


INVOICE_SYSTEM = "Extract the invoice as JSON with invoice_number, vendor and total."
DOCUMENT = "Invoice INV-2291 from Kiln Supplies, total 1240.50"
NO_NUMBER = '{"vendor": "Kiln Supplies", "total": "1240.50"}'
GOOD = '{"invoice_number": "INV-2291", "vendor": "Kiln Supplies", "total": "1240.50"}'


@test("Repairs the example's missing field on the second attempt")
def _():
    llm = ScriptedLLM([NO_NUMBER, GOOD])
    result = extract_with_repair(llm, DOCUMENT, Invoice, system=INVOICE_SYSTEM)
    assert result.value.invoice_number == "INV-2291"
    assert result.attempts == 2
    assert [m["role"] for m in llm.calls[1]["messages"]] == ["user", "assistant", "user"]
    assert "invoice_number: Field required" in llm.calls[1]["messages"][2]["content"]


@test("Sends the document in tags, the system prompt and temperature 0 on every call")
def _():
    llm = ScriptedLLM([NO_NUMBER, GOOD])
    extract_with_repair(llm, DOCUMENT, Invoice, system=INVOICE_SYSTEM)
    assert llm.calls[0]["messages"] == [{"role": "user", "content": f"<document>\n{DOCUMENT}\n</document>"}]
    assert [call["system"] for call in llm.calls] == [INVOICE_SYSTEM, INVOICE_SYSTEM]
    assert [call["temperature"] for call in llm.calls] == [0, 0]
    assert llm.calls[1]["messages"][1] == {"role": "assistant", "content": NO_NUMBER}


@test("Explains a reply with no JSON in it")
def _():
    llm = ScriptedLLM(["Which invoice do you mean?", GOOD])
    assert extract_with_repair(llm, DOCUMENT, Invoice, system=INVOICE_SYSTEM).attempts == 2
    assert "No JSON object found in the reply" in llm.calls[1]["messages"][2]["content"]


@test("Gives up after max_attempts calls with the evidence")
def _():
    llm = ScriptedLLM([NO_NUMBER, NO_NUMBER])
    with raises(ExtractionFailed, what="extract_with_repair(..., max_attempts=2)") as caught:
        extract_with_repair(llm, DOCUMENT, Invoice, system=INVOICE_SYSTEM, max_attempts=2)
    assert len(llm.calls) == 2
    assert caught.value.last_reply == NO_NUMBER
    assert caught.value.problems == "invoice_number: Field required"


@test("Keeps the whole history across several repairs")
def _():
    llm = ScriptedLLM([NO_NUMBER, '{"invoice_number": "", "vendor": "Kiln Supplies", "total": 5}', GOOD])
    assert extract_with_repair(llm, DOCUMENT, Invoice, system=INVOICE_SYSTEM).attempts == 3
    assert [m["role"] for m in llm.calls[2]["messages"]] == ["user", "assistant", "user", "assistant", "user"]


@hidden("Sums tokens over every attempt")
def _():
    llm = ScriptedLLM([
        Reply(text=NO_NUMBER, usage=Usage(input_tokens=120, output_tokens=30)),
        Reply(text=GOOD, usage=Usage(input_tokens=180, output_tokens=35)),
    ])
    result = extract_with_repair(llm, DOCUMENT, Invoice, system=INVOICE_SYSTEM)
    assert (result.input_tokens, result.output_tokens) == (300, 65)


@hidden("Doesn't retry a reply cut off at max_tokens")
def _():
    llm = ScriptedLLM([Reply(text='{"invoice_number": "INV-22', stop_reason="max_tokens"), GOOD])
    raises(ExtractionFailed, extract_with_repair, llm, DOCUMENT, Invoice, system=INVOICE_SYSTEM, match="max_tokens")
    assert len(llm.calls) == 1


@hidden("Works for any model class")
def _():
    llm = ScriptedLLM(['{"company": "Northwind", "seats": 40, "plan": "Team"}',
                       '{"company": "Northwind", "seats": 40, "plan": "team"}'])
    result = extract_with_repair(llm, "Northwind, 40 seats, team plan", Lead, system="Extract the lead.")
    assert result.value == Lead(company="Northwind", seats=40, plan="team")
    assert "plan: Input should be 'starter', 'team' or 'enterprise'" in llm.calls[1]["messages"][2]["content"]
