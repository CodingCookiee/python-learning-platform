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


def extract_with_repair[M: BaseModel](
    llm, document: str, model_cls: type[M], *, system: str, max_attempts: int = 3
) -> Extraction:
    """Extract a model_cls from document, repairing bad replies up to max_attempts calls in total."""
    messages = [{"role": "user", "content": f"<document>\n{document}\n</document>"}]
    input_tokens = output_tokens = 0
    problems, reply = "", ""
    for attempt in range(1, max_attempts + 1):
        response = llm.complete(messages, system=system, temperature=0)
        input_tokens += response.usage.input_tokens
        output_tokens += response.usage.output_tokens
        reply = response.text
        if response.stop_reason == "max_tokens":
            raise ExtractionFailed("The reply was cut off at max_tokens", reply)
        try:
            value = model_cls.model_validate(extract_json(reply))
        except ValidationError as error:
            problems = validation_feedback(error)
        except ValueError as error:
            problems = str(error)
        else:
            return Extraction(value, attempt, input_tokens, output_tokens)
        messages.append({"role": "assistant", "content": reply})
        messages.append({
            "role": "user",
            "content": f"Your reply had these problems:\n{problems}\nReply with only the corrected JSON object.",
        })
    raise ExtractionFailed(problems, reply)
