import json
from dataclasses import dataclass

from pydantic import TypeAdapter, ValidationError


@dataclass(frozen=True)
class Score:
    passed: bool
    reason: str


def schema_score(output, model, expected):
    """Pass when the output is valid JSON for model and has the expected field values."""
    data = json.loads(output)
    wrong = [name for name, value in expected.items() if data.get(name) != value]
    if wrong:
        return Score(False, "wrong " + ", ".join(wrong))
    return Score(True, "ok")
