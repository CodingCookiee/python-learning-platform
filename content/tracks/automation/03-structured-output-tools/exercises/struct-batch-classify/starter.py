import json
from itertools import batched
from typing import Literal

from pydantic import BaseModel

BATCH_SYSTEM = """Classify each support ticket in the JSON array between <tickets> tags as one of:
billing, shipping, returns, technical, unknown.
Reply with only a JSON object: {"results": [{"id": "<ticket id>", "category": "<category>"}, ...]},
with one result for every ticket."""


class Labelled(BaseModel):
    id: str
    category: Literal["billing", "shipping", "returns", "technical", "unknown"]


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


def classify_batch(llm, tickets, *, batch_size=20):
    """Classify every ticket, batch_size per call. Returns {ticket_id: category}."""
    results = {}
    for ticket_id, text in tickets.items():
        response = llm.complete([{"role": "user", "content": text}], system=BATCH_SYSTEM)
        results[ticket_id] = response.text
    return results
