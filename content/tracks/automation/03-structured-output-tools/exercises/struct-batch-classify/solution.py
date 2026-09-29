import json
from itertools import batched
from typing import Literal

from pydantic import BaseModel, ValidationError

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


def classify_batch(llm, tickets: dict[str, str], *, batch_size: int = 20) -> dict[str, str]:
    """Classify every ticket, batch_size per call. Returns {ticket_id: category}."""
    results = {ticket_id: "unknown" for ticket_id in tickets}
    for batch in batched(tickets.items(), batch_size):
        payload = [{"id": ticket_id, "text": text} for ticket_id, text in batch]
        response = llm.complete(
            [{"role": "user", "content": f"<tickets>\n{json.dumps(payload)}\n</tickets>"}],
            system=BATCH_SYSTEM,
            temperature=0,
        )
        try:
            items = extract_json(response.text).get("results", [])
        except ValueError:
            continue
        in_batch = {ticket_id for ticket_id, _text in batch}
        for item in items if isinstance(items, list) else []:
            try:
                labelled = Labelled.model_validate(item)
            except ValidationError:
                continue
            if labelled.id in in_batch:
                results[labelled.id] = labelled.category
    return results
