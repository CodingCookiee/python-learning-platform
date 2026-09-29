import json
from datetime import date
from decimal import Decimal
from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator

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


class Invoice(BaseModel):
    invoice_number: str = Field(min_length=1)
    vendor: str
    issue_date: date
    due_date: date
    currency: Literal["EUR", "GBP", "USD"]
    total: Decimal = Field(gt=0, decimal_places=2)

    @field_validator("currency", mode="before")
    @classmethod
    def normalise_currency(cls, value):
        return value.strip().upper() if isinstance(value, str) else value

    @model_validator(mode="after")
    def due_after_issue(self):
        if self.due_date < self.issue_date:
            raise ValueError("due_date is before issue_date")
        return self


def parse_invoice(reply: str) -> Invoice:
    """Find the JSON object in the model's reply and validate it as an Invoice."""
    return Invoice.model_validate(extract_json(reply))
