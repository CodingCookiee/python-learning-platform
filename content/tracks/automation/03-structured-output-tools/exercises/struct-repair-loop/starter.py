import json
from dataclasses import dataclass
from typing import Any

from pydantic import BaseModel, ValidationError


@dataclass
class Extraction:
    value: Any            # the validated model instance
    attempts: int         # calls made, including the first
    input_tokens: int     # summed over every call
    output_tokens: int


class ExtractionFailed(Exception):
    """No valid result after every attempt. Carries the evidence for a human reviewer."""

    def __init__(self, problems, last_reply):
        super().__init__(f"Extraction failed:\n{problems}")
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


def extract_with_repair(llm, document, model_cls, *, system, max_attempts=3):
    """Extract a model_cls from document, repairing bad replies up to max_attempts calls in total."""
    ...
