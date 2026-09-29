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
    invoice_number: str
    vendor: str
    # issue_date, due_date, currency and total, with their rules


def parse_invoice(reply):
    """Find the JSON object in the model's reply and validate it as an Invoice."""
    ...
