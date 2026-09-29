import json
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, ValidationError

MAX_ATTEMPTS = 3

INVOICE_SYSTEM = """Extract the invoice between the <invoice> tags.
Reply with only a JSON object with the fields invoice_number (string), vendor (string),
currency ("EUR", "GBP" or "USD") and total (a number with 2 decimal places)."""


class Invoice(BaseModel):
    invoice_number: str = Field(min_length=1)
    vendor: str
    currency: Literal["EUR", "GBP", "USD"]
    total: Decimal = Field(gt=0, decimal_places=2)


class ExtractionFailed(Exception):
    """No valid result after every attempt. Carries the evidence for a human reviewer."""

    def __init__(self, problems, last_reply):
        super().__init__(f"No valid invoice after {MAX_ATTEMPTS} attempts:\n{problems}")
        self.problems = problems
        self.last_reply = last_reply


_decoder = json.JSONDecoder()


def extract_json(text):
    """Return the first JSON object (a dict) in text. ValueError if there isn't one."""
    start = text.find("{")
    while start != -1:
        try:
            value, _end = _decoder.raw_decode(text, start)
        except json.JSONDecodeError:
            pass
        else:
            if isinstance(value, dict):
                return value
        start = text.find("{", start + 1)
    raise ValueError("No JSON object found in the reply")


def validation_feedback(error):
    """One "location: message" line per problem in a ValidationError."""
    return "\n".join(
        f"{'.'.join(str(part) for part in item['loc']) or '(root)'}: {item['msg']}" for item in error.errors()
    )


def extract_invoice(llm, document):
    """Extract an Invoice from the document, sending validation errors back to the model."""
    messages = [{"role": "user", "content": f"<invoice>\n{document}\n</invoice>"}]
    for _attempt in range(MAX_ATTEMPTS):
        response = llm.complete(messages, system=INVOICE_SYSTEM, temperature=0)
        try:
            return Invoice.model_validate(extract_json(response.text))
        except ValidationError as error:
            problems = validation_feedback(error)
        except ValueError as error:
            problems = str(error)
        messages.append({"role": "assistant", "content": response.text})
        messages.append({
            "role": "user",
            "content": f"Your reply had these problems:\n{problems}\nReply with only the corrected JSON object.",
        })
    raise ExtractionFailed(problems, response.text)
